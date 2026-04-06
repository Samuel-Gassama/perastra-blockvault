/**
 * Extract and inline CSS for selected blocks.
 *
 * Two-phase approach:
 * 1. Inline critical computed styles (colors, fonts, spacing) directly
 *    onto the block HTML elements in the serialized markup.
 * 2. Capture responsive (@media) and interactive (:hover, :focus) rules
 *    from stylesheets as a separate CSS string.
 *
 * Pro+ plan feature.
 */

/**
 * Get the document where blocks live.
 * WordPress 6.x+ renders blocks inside an iframe.
 */
function getEditorDocument() {
	const iframe = document.querySelector( 'iframe[name="editor-canvas"]' );
	if ( iframe && iframe.contentDocument ) {
		return iframe.contentDocument;
	}
	return document;
}

// Critical CSS properties to inline onto elements.
const CRITICAL_PROPERTIES = [
	'color', 'background-color', 'background-image', 'background',
	'font-family', 'font-size', 'font-weight', 'font-style',
	'line-height', 'letter-spacing', 'text-transform', 'text-decoration',
	'text-align',
	'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
	'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
	'border', 'border-radius', 'border-color', 'border-width', 'border-style',
	'box-shadow',
	'display', 'flex-direction', 'justify-content', 'align-items', 'gap',
	'width', 'max-width', 'min-height',
	'position',
	'opacity',
];

// Default values to skip (browser defaults, not worth inlining).
const SKIP_VALUES = new Set( [
	'transparent', 'rgba(0, 0, 0, 0)', 'none', 'normal', 'auto',
	'0px', '0', 'start', 'stretch', 'static', 'visible', '1',
	'baseline', 'inherit', 'initial',
] );

// Editor-specific selectors to filter out.
const EDITOR_PREFIXES = [
	'.editor-styles-wrapper',
	'.block-editor-',
	'.wp-block-editor',
	'.is-selected',
	'.is-highlighted',
	'.is-hovered',
	'.has-child-selected',
	'.is-navigate-mode',
	'.is-editing-disabled',
	'.is-focus-mode',
];

/**
 * Get the computed "non-default" styles for an element by diffing
 * against a reference element's defaults.
 */
function getSignificantStyles( element, referenceStyles ) {
	const doc = element.ownerDocument;
	const win = doc.defaultView || window;
	const computed = win.getComputedStyle( element );
	const styles = {};

	for ( const prop of CRITICAL_PROPERTIES ) {
		const value = computed.getPropertyValue( prop );
		const refValue = referenceStyles?.getPropertyValue( prop ) || '';

		if (
			value &&
			! SKIP_VALUES.has( value ) &&
			value !== refValue
		) {
			styles[ prop ] = value;
		}
	}

	return styles;
}

/**
 * Create a reference element to get browser default styles.
 */
function getDefaultStyles() {
	const doc = getEditorDocument();
	const ref = doc.createElement( 'div' );
	ref.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;';
	doc.body.appendChild( ref );
	const win = doc.defaultView || window;
	const styles = win.getComputedStyle( ref );
	// Clone the values since we'll remove the element.
	const clone = {};
	for ( const prop of CRITICAL_PROPERTIES ) {
		clone[ prop ] = styles.getPropertyValue( prop );
	}
	doc.body.removeChild( ref );
	return {
		getPropertyValue: ( prop ) => clone[ prop ] || '',
	};
}

/**
 * Inline critical computed styles onto the serialized markup.
 *
 * Walks each element in the block DOM, computes significant styles,
 * and adds them as inline styles to the serialized HTML.
 *
 * @param {string}   markup    - Serialized block markup.
 * @param {string[]} clientIds - Block client IDs.
 * @return {string} Markup with inlined styles.
 */
export function inlineBlockStyles( markup, clientIds ) {
	if ( ! clientIds || clientIds.length === 0 ) {
		return markup;
	}

	const doc = getEditorDocument();
	const win = doc.defaultView || window;

	// eslint-disable-next-line no-console
	console.log( '[BlockVault CSS] Editor document:', doc === document ? 'main document' : 'iframe', doc );
	// eslint-disable-next-line no-console
	console.log( '[BlockVault CSS] Looking for clientIds:', clientIds );

	const defaults = getDefaultStyles();

	// Build a map of class combinations → inline styles from the live DOM.
	const styleMap = new Map();

	clientIds.forEach( ( clientId ) => {
		const el = doc.querySelector( `[data-block="${ clientId }"]` );
		// eslint-disable-next-line no-console
		console.log( `[BlockVault CSS] Block ${ clientId }:`, el ? 'FOUND' : 'NOT FOUND', el );
		if ( ! el ) return;

		// Process the block element and all children.
		const elements = [ el, ...el.querySelectorAll( '*' ) ];

		elements.forEach( ( domEl ) => {
			if ( ! domEl.className || typeof domEl.className !== 'string' ) return;

			const classes = Array.from( domEl.classList )
				.filter( ( c ) =>
					! c.startsWith( 'is-' ) &&
					! c.startsWith( 'block-editor' ) &&
					! c.startsWith( 'editor-' ) &&
					! c.startsWith( 'components-' ) &&
					! c.startsWith( 'rich-text' ) &&
					c !== 'wp-block'
				)
				.sort()
				.join( '.' );

			if ( ! classes || styleMap.has( classes ) ) return;

			const styles = getSignificantStyles( domEl, defaults );
			if ( Object.keys( styles ).length > 0 ) {
				styleMap.set( classes, styles );
			}
		} );
	} );

	// eslint-disable-next-line no-console
	console.log( `[BlockVault CSS] Style map: ${ styleMap.size } entries`, Object.fromEntries( styleMap ) );

	if ( styleMap.size === 0 ) {
		// eslint-disable-next-line no-console
		console.log( '[BlockVault CSS] No styles captured — returning original markup' );
		return markup;
	}

	// Apply inline styles to the markup by matching class attributes.
	let result = markup;

	styleMap.forEach( ( styles, classKey ) => {
		const cssString = Object.entries( styles )
			.map( ( [ prop, val ] ) => `${ prop }:${ val }` )
			.join( ';' );

		if ( ! cssString ) return;

		// Find elements in markup with these classes and merge inline styles.
		const classArray = classKey.split( '.' );

		// Build a regex that matches class attributes containing ALL these classes.
		// Only process if we can find a reasonable match.
		if ( classArray.length === 0 ) return;

		// Simple approach: find the first class in the markup and check context.
		const primaryClass = classArray[ 0 ];
		const classRegex = new RegExp(
			`(class="[^"]*\\b${ escapeRegex( primaryClass ) }\\b[^"]*")([^>]*)(style="([^"]*)")?`,
			'g'
		);

		result = result.replace( classRegex, ( match, classAttr, between, styleAttr, existingStyles ) => {
			// Verify all classes are present.
			const allPresent = classArray.every( ( c ) => {
				const re = new RegExp( `\\b${ escapeRegex( c ) }\\b` );
				return re.test( classAttr );
			} );

			if ( ! allPresent ) return match;

			if ( existingStyles ) {
				// Merge: existing styles take precedence.
				const merged = cssString + ';' + existingStyles;
				return `${ classAttr }${ between }style="${ merged }"`;
			}

			return `${ classAttr }${ between }style="${ cssString }"`;
		} );
	} );

	return result;
}

function escapeRegex( str ) {
	return str.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
}

/**
 * Extract responsive and interactive CSS rules for the blocks.
 * Strips editor-specific selectors. Only captures @media and
 * pseudo-class (:hover, :focus, etc.) rules.
 *
 * @param {string[]} clientIds - Block client IDs.
 * @return {string} CSS string with responsive/interactive rules.
 */
export function extractResponsiveCSS( clientIds ) {
	if ( ! clientIds || clientIds.length === 0 ) {
		return '';
	}

	const doc = getEditorDocument();
	// eslint-disable-next-line no-console
	console.log( '[BlockVault CSS] extractResponsiveCSS - stylesheets:', doc.styleSheets.length );

	// Collect class names from block DOM elements.
	const allClasses = new Set();

	clientIds.forEach( ( clientId ) => {
		const el = doc.querySelector( `[data-block="${ clientId }"]` );
		if ( ! el ) return;
		collectClasses( el, allClasses );
	} );

	// eslint-disable-next-line no-console
	console.log( '[BlockVault CSS] Classes found:', Array.from( allClasses ) );

	if ( allClasses.size === 0 ) {
		return '';
	}

	const matchedRules = [];
	const seenRules = new Set();

	for ( const sheet of Array.from( doc.styleSheets ) ) {
		let rules;
		try {
			rules = sheet.cssRules || sheet.rules;
		} catch {
			continue; // Cross-origin stylesheet.
		}
		if ( ! rules ) continue;

		for ( const rule of rules ) {
			// Only capture @media rules and rules with pseudo-classes.
			if ( rule.type === CSSRule.MEDIA_RULE ) {
				const innerMatches = [];

				for ( const innerRule of rule.cssRules ) {
					if ( innerRule.type !== CSSRule.STYLE_RULE ) continue;
					const selector = cleanSelector( innerRule.selectorText );
					if ( ! selector ) continue;
					if ( selectorMatchesClasses( selector, allClasses ) ) {
						innerMatches.push( `  ${ selector } { ${ innerRule.style.cssText } }` );
					}
				}

				if ( innerMatches.length > 0 ) {
					const mediaRule = `@media ${ rule.conditionText } {\n${ innerMatches.join( '\n' ) }\n}`;
					if ( ! seenRules.has( mediaRule ) ) {
						seenRules.add( mediaRule );
						matchedRules.push( mediaRule );
					}
				}
			} else if ( rule.type === CSSRule.STYLE_RULE ) {
				// Capture rules with pseudo-classes (:hover, :focus, :active, etc.)
				if ( /:(hover|focus|active|visited|focus-within|focus-visible)/.test( rule.selectorText ) ) {
					const selector = cleanSelector( rule.selectorText );
					if ( selector && selectorMatchesClasses( selector, allClasses ) ) {
						const ruleText = `${ selector } { ${ rule.style.cssText } }`;
						if ( ! seenRules.has( ruleText ) ) {
							seenRules.add( ruleText );
							matchedRules.push( ruleText );
						}
					}
				}
			}
		}
	}

	return matchedRules.join( '\n' );
}

/**
 * Remove editor-specific prefixes from a selector.
 */
function cleanSelector( selector ) {
	if ( ! selector ) return '';

	let cleaned = selector;

	// Remove .editor-styles-wrapper prefix.
	cleaned = cleaned.replace( /\.editor-styles-wrapper\s+/g, '' );

	// Skip if it still contains editor-specific selectors.
	for ( const prefix of EDITOR_PREFIXES ) {
		if ( cleaned.includes( prefix ) ) return '';
	}

	return cleaned.trim();
}

/**
 * Check if a selector references any of the given class names.
 */
function selectorMatchesClasses( selector, classNames ) {
	for ( const cls of classNames ) {
		if ( selector.includes( `.${ cls }` ) ) {
			return true;
		}
	}
	return false;
}

/**
 * Collect all class names from an element and its descendants.
 */
function collectClasses( element, classes ) {
	if ( element.classList ) {
		element.classList.forEach( ( cls ) => {
			if (
				! cls.startsWith( 'is-' ) &&
				! cls.startsWith( 'block-editor' ) &&
				! cls.startsWith( 'editor-' ) &&
				! cls.startsWith( 'components-' ) &&
				! cls.startsWith( 'rich-text' ) &&
				cls !== 'wp-block'
			) {
				classes.add( cls );
			}
		} );
	}

	const children = element.querySelectorAll( '*' );
	children.forEach( ( child ) => {
		if ( child.classList ) {
			child.classList.forEach( ( cls ) => {
				if (
					! cls.startsWith( 'is-' ) &&
					! cls.startsWith( 'block-editor' ) &&
					! cls.startsWith( 'editor-' ) &&
					! cls.startsWith( 'components-' ) &&
					! cls.startsWith( 'rich-text' ) &&
					cls !== 'wp-block'
				) {
					classes.add( cls );
				}
			} );
		}
	} );
}
