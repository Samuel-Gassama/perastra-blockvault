/**
 * Extract relevant CSS rules for selected blocks.
 *
 * Walks the DOM elements of selected blocks, collects all class names,
 * then searches accessible stylesheets for matching rules.
 * Returns a CSS string that can be saved alongside block markup
 * so styles survive cross-site transfer.
 *
 * Pro+ plan feature.
 */

/**
 * Collect all unique class names from an element and its descendants.
 */
function collectClasses( element ) {
	const classes = new Set();

	if ( element.classList ) {
		element.classList.forEach( ( cls ) => classes.add( cls ) );
	}

	const children = element.querySelectorAll( '*' );
	children.forEach( ( child ) => {
		if ( child.classList ) {
			child.classList.forEach( ( cls ) => classes.add( cls ) );
		}
	} );

	return classes;
}

/**
 * Check if a CSS selector references any of the given class names.
 */
function selectorMatchesClasses( selector, classNames ) {
	for ( const cls of classNames ) {
		// Match .classname in the selector (with word boundary awareness).
		if ( selector.includes( `.${ cls }` ) ) {
			return true;
		}
	}
	return false;
}

/**
 * Resolve CSS custom properties (variables) to their computed values.
 */
function resolveVariables( cssText, computedStyle ) {
	return cssText.replace( /var\(\s*(--[^,)]+)(?:\s*,\s*([^)]+))?\s*\)/g, ( match, varName, fallback ) => {
		const value = computedStyle?.getPropertyValue( varName.trim() );
		if ( value && value.trim() ) {
			return value.trim();
		}
		return fallback?.trim() || match;
	} );
}

/**
 * Extract CSS rules matching the given block elements.
 *
 * @param {string[]} clientIds - Block client IDs to extract CSS for.
 * @return {string} Extracted CSS string, or empty string if none found.
 */
export function extractBlockCSS( clientIds ) {
	if ( ! clientIds || clientIds.length === 0 ) {
		return '';
	}

	// Find the block DOM elements by their data-block attribute.
	const allClasses = new Set();
	const rootElements = [];

	clientIds.forEach( ( clientId ) => {
		const el = document.querySelector(
			`[data-block="${ clientId }"]`
		);
		if ( el ) {
			rootElements.push( el );
			const classes = collectClasses( el );
			classes.forEach( ( cls ) => allClasses.add( cls ) );
		}
	} );

	if ( allClasses.size === 0 ) {
		return '';
	}

	// Filter out WordPress editor-specific classes we don't want to capture.
	const editorPrefixes = [
		'is-selected', 'is-highlighted', 'is-hovered', 'is-editing',
		'is-focused', 'is-dragging', 'is-navigate-mode', 'has-child-selected',
		'block-editor-', 'editor-', 'wp-block-editor',
		'rich-text', 'components-', 'is-multi-selected',
	];

	const filteredClasses = new Set();
	allClasses.forEach( ( cls ) => {
		const skip = editorPrefixes.some( ( prefix ) => cls.startsWith( prefix ) );
		if ( ! skip ) {
			filteredClasses.add( cls );
		}
	} );

	if ( filteredClasses.size === 0 ) {
		return '';
	}

	// Walk through all accessible stylesheets and collect matching rules.
	const matchedRules = [];
	const seenRules = new Set();

	const sheets = Array.from( document.styleSheets );

	for ( const sheet of sheets ) {
		let rules;
		try {
			rules = sheet.cssRules || sheet.rules;
		} catch {
			// Cross-origin stylesheet — skip (e.g., Google Fonts CDN).
			continue;
		}

		if ( ! rules ) continue;

		for ( const rule of rules ) {
			processRule( rule, filteredClasses, matchedRules, seenRules );
		}
	}

	if ( matchedRules.length === 0 ) {
		return '';
	}

	// Resolve CSS variables using the first root element's computed style.
	const computedStyle = rootElements[ 0 ]
		? window.getComputedStyle( rootElements[ 0 ] )
		: null;

	let css = matchedRules.join( '\n' );

	// Resolve CSS custom properties to their computed values.
	css = resolveVariables( css, computedStyle );

	// Also resolve variables from :root.
	const rootStyle = window.getComputedStyle( document.documentElement );
	css = resolveVariables( css, rootStyle );

	return css;
}

/**
 * Process a single CSS rule (handles @media, @supports, etc.).
 */
function processRule( rule, classNames, matchedRules, seenRules ) {
	// Regular style rule.
	if ( rule.type === CSSRule.STYLE_RULE ) {
		if ( selectorMatchesClasses( rule.selectorText, classNames ) ) {
			const ruleText = rule.cssText;
			if ( ! seenRules.has( ruleText ) ) {
				seenRules.add( ruleText );
				matchedRules.push( ruleText );
			}
		}
		return;
	}

	// @media rule — check inner rules and wrap matches.
	if ( rule.type === CSSRule.MEDIA_RULE ) {
		const innerMatches = [];
		const innerSeen = new Set();

		for ( const innerRule of rule.cssRules ) {
			if (
				innerRule.type === CSSRule.STYLE_RULE &&
				selectorMatchesClasses( innerRule.selectorText, classNames )
			) {
				const ruleText = innerRule.cssText;
				if ( ! innerSeen.has( ruleText ) ) {
					innerSeen.add( ruleText );
					innerMatches.push( ruleText );
				}
			}
		}

		if ( innerMatches.length > 0 ) {
			const mediaText = `@media ${ rule.conditionText } {\n${ innerMatches.join( '\n' ) }\n}`;
			if ( ! seenRules.has( mediaText ) ) {
				seenRules.add( mediaText );
				matchedRules.push( mediaText );
			}
		}
		return;
	}

	// @supports rule — same approach.
	if ( rule.type === CSSRule.SUPPORTS_RULE ) {
		const innerMatches = [];

		for ( const innerRule of rule.cssRules ) {
			if (
				innerRule.type === CSSRule.STYLE_RULE &&
				selectorMatchesClasses( innerRule.selectorText, classNames )
			) {
				innerMatches.push( innerRule.cssText );
			}
		}

		if ( innerMatches.length > 0 ) {
			matchedRules.push(
				`@supports ${ rule.conditionText } {\n${ innerMatches.join( '\n' ) }\n}`
			);
		}
	}
}
