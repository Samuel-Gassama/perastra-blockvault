/**
 * Extract CSS from the frontend page for selected blocks.
 *
 * Approach:
 * 1. Get the block's class names from the editor DOM
 * 2. Fetch the actual frontend page HTML
 * 3. Parse all <link rel="stylesheet"> URLs and <style> tags
 * 4. Fetch each stylesheet
 * 5. Match CSS rules against the block's classes
 * 6. Return the matched CSS
 *
 * Pro+ plan feature.
 */

/* global perastraBlockvaultSettings */

/**
 * Get the document where blocks live (handles iframe editor).
 */
function getEditorDocument() {
	const iframe = document.querySelector( 'iframe[name="editor-canvas"]' );
	if ( iframe && iframe.contentDocument ) {
		return iframe.contentDocument;
	}
	return document;
}

/**
 * Collect all unique class names from the serialized block markup.
 * Much more reliable than reading the editor DOM which uses different classes.
 */
function collectClassesFromMarkup( markup ) {
	const classes = new Set();

	// Match all class="..." attributes in the markup.
	const classRegex = /class="([^"]*)"/g;
	let match;
	while ( ( match = classRegex.exec( markup ) ) !== null ) {
		const classList = match[ 1 ].split( /\s+/ );
		classList.forEach( ( cls ) => {
			if (
				cls &&
				cls.length > 2 &&
				! cls.startsWith( 'wp-block-' ) &&
				! cls.startsWith( 'wp-element-' ) &&
				! cls.startsWith( 'is-' ) &&
				! cls.startsWith( 'has-' ) &&
				! cls.startsWith( 'alignwide' ) &&
				! cls.startsWith( 'alignfull' ) &&
				cls !== 'wp-block' &&
				cls !== 'wp-block-button' &&
				cls !== 'wp-block-buttons' &&
				cls !== 'wp-block-column' &&
				cls !== 'wp-block-columns' &&
				cls !== 'wp-block-group' &&
				cls !== 'wp-block-heading' &&
				cls !== 'wp-block-image'
			) {
				classes.add( cls );
			}
		} );
	}

	return classes;
}

/**
 * Fetch the frontend page and extract all stylesheet URLs and inline styles.
 */
async function fetchFrontendStyles() {
	// Get the current page's frontend URL.
	const siteUrl = perastraBlockvaultSettings?.siteUrl || '';
	if ( ! siteUrl ) return { stylesheetUrls: [], inlineStyles: [] };

	// Get the current post permalink from WordPress data.
	let pageUrl = siteUrl;
	try {
		const { select } = wp.data;
		const postId = select( 'core/editor' ).getCurrentPostId();
		const postLink = select( 'core/editor' ).getPermalink();
		if ( postLink ) {
			pageUrl = postLink;
		} else if ( postId ) {
			pageUrl = `${ siteUrl }/?p=${ postId }`;
		}
	} catch {
		// Fallback to site URL.
	}



	try {
		const response = await fetch( pageUrl, {
			credentials: 'same-origin',
		} );
		const html = await response.text();

		// Parse the HTML to find stylesheets and inline styles.
		const parser = new DOMParser();
		const doc = parser.parseFromString( html, 'text/html' );

		// Get all <link rel="stylesheet"> URLs.
		const links = doc.querySelectorAll( 'link[rel="stylesheet"]' );
		const stylesheetUrls = Array.from( links )
			.map( ( link ) => link.href )
			.filter( ( href ) => href && ! href.includes( 'wp-admin' ) );

		// Get all inline <style> content.
		const styleTags = doc.querySelectorAll( 'style' );
		const inlineStyles = Array.from( styleTags )
			.map( ( s ) => s.textContent )
			.filter( Boolean );



		return { stylesheetUrls, inlineStyles };
	} catch ( err ) {

		return { stylesheetUrls: [], inlineStyles: [] };
	}
}

/**
 * Fetch a stylesheet and return its CSS text.
 */
async function fetchStylesheet( url ) {
	try {
		const response = await fetch( url, { credentials: 'same-origin' } );
		if ( ! response.ok ) return '';
		return await response.text();
	} catch {
		return '';
	}
}

/**
 * Parse CSS text and extract rules matching the given class names.
 * Returns matched rules as a string.
 */
function matchRulesFromCSS( cssText, classNames ) {
	const matched = [];
	const seen = new Set();

	// Use a temporary style element to parse the CSS.
	const style = document.createElement( 'style' );
	style.textContent = cssText;
	document.head.appendChild( style );

	const sheet = style.sheet;
	if ( ! sheet ) {
		document.head.removeChild( style );
		return '';
	}

	try {
		const rules = sheet.cssRules || sheet.rules;
		if ( ! rules ) {
			document.head.removeChild( style );
			return '';
		}

		for ( const rule of rules ) {
			processRule( rule, classNames, matched, seen );
		}
	} catch {
		// Parsing error — skip.
	}

	document.head.removeChild( style );
	return matched.join( '\n' );
}

/**
 * Process a CSS rule and check if it matches any class names.
 */
function processRule( rule, classNames, matched, seen ) {
	if ( rule.type === CSSRule.STYLE_RULE ) {
		if ( selectorMatchesClasses( rule.selectorText, classNames ) ) {
			const text = rule.cssText;
			if ( ! seen.has( text ) ) {
				seen.add( text );
				matched.push( text );
			}
		}
	} else if ( rule.type === CSSRule.MEDIA_RULE ) {
		const inner = [];
		for ( const innerRule of rule.cssRules ) {
			if (
				innerRule.type === CSSRule.STYLE_RULE &&
				selectorMatchesClasses( innerRule.selectorText, classNames )
			) {
				inner.push( `  ${ innerRule.cssText }` );
			}
		}
		if ( inner.length > 0 ) {
			const mediaText = `@media ${ rule.conditionText } {\n${ inner.join( '\n' ) }\n}`;
			if ( ! seen.has( mediaText ) ) {
				seen.add( mediaText );
				matched.push( mediaText );
			}
		}
	}
}

/**
 * Check if a CSS selector references any of the given class names.
 */
function selectorMatchesClasses( selector, classNames ) {
	if ( ! selector ) return false;
	for ( const cls of classNames ) {
		if ( selector.includes( `.${ cls }` ) ) {
			return true;
		}
	}
	return false;
}

/**
 * Main function: extract CSS from the frontend for the selected blocks.
 *
 * @param {string[]} clientIds - Block client IDs (unused now, kept for API compat).
 * @param {string}   markup    - Serialized block markup to extract classes from.
 * @return {Promise<string>} Extracted CSS string.
 */
export async function extractBlockCSS( clientIds, markup ) {
	if ( ! markup ) {
		return '';
	}

	// Step 1: Get class names from the serialized markup (not the editor DOM).
	const classNames = collectClassesFromMarkup( markup );



	if ( classNames.size === 0 ) {
		return '';
	}

	// Step 2: Fetch the frontend page to get stylesheet URLs.
	const { stylesheetUrls, inlineStyles } = await fetchFrontendStyles();

	// Step 3: Fetch each stylesheet and match rules.
	let allCSS = '';

	// Process inline styles first.
	for ( const css of inlineStyles ) {
		const matched = matchRulesFromCSS( css, classNames );
		if ( matched ) allCSS += matched + '\n';
	}

	// Fetch and process external stylesheets (in parallel, max 10).
	const urls = stylesheetUrls.slice( 0, 10 );
	const sheets = await Promise.all( urls.map( fetchStylesheet ) );

	for ( const css of sheets ) {
		if ( ! css ) continue;
		const matched = matchRulesFromCSS( css, classNames );
		if ( matched ) allCSS += matched + '\n';
	}

	allCSS = allCSS.trim();



	return allCSS;
}
