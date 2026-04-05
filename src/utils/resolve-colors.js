/**
 * Resolve theme-dependent palette colors to inline hex values.
 *
 * Gutenberg stores palette colours as slugs (e.g. backgroundColor: "vivid-cyan-blue")
 * that map to CSS classes defined by the active theme. When a block is inserted on a
 * site with a different theme those classes may not exist and the colour disappears.
 *
 * This utility converts every recognised palette reference into an explicit inline
 * style so colours survive cross-site transfer.
 */

/**
 * Walk an array of blocks and convert palette color / gradient / font-size
 * references to explicit inline styles.
 *
 * @param {Array} blocks     Block objects from the editor.
 * @param {Array} colors     Color palette  — [{ name, slug, color }, ...].
 * @param {Array} gradients  Gradient presets — [{ name, slug, gradient }, ...].
 * @param {Array} fontSizes  Font-size presets — [{ name, slug, size }, ...].
 * @return {Array} Cloned blocks with inline styles.
 */
export function resolveBlockColors(
	blocks,
	colors = [],
	gradients = [],
	fontSizes = []
) {
	if ( ! colors.length && ! gradients.length && ! fontSizes.length ) {
		return blocks;
	}
	return blocks.map( ( block ) =>
		resolveForBlock( block, colors, gradients, fontSizes )
	);
}

/* ── helpers ─────────────────────────────────────────────────────────── */

function findColor( colors, slug ) {
	return colors.find( ( c ) => c.slug === slug );
}

function findGradient( gradients, slug ) {
	return gradients.find( ( g ) => g.slug === slug );
}

function findFontSize( fontSizes, slug ) {
	return fontSizes.find( ( f ) => f.slug === slug );
}

/* ── per-block resolver ──────────────────────────────────────────────── */

function resolveForBlock( block, colors, gradients, fontSizes ) {
	const attrs = block.attributes;

	// Deep-clone the style object so we never mutate editor state.
	const style = JSON.parse( JSON.stringify( attrs.style || {} ) );
	const colorStyle = style.color || {};
	const removals = [];
	let changed = false;

	// backgroundColor  →  style.color.background
	if ( attrs.backgroundColor ) {
		const match = findColor( colors, attrs.backgroundColor );
		if ( match ) {
			colorStyle.background = match.color;
			removals.push( 'backgroundColor' );
			changed = true;
		}
	}

	// textColor  →  style.color.text
	if ( attrs.textColor ) {
		const match = findColor( colors, attrs.textColor );
		if ( match ) {
			colorStyle.text = match.color;
			removals.push( 'textColor' );
			changed = true;
		}
	}

	// gradient  →  style.color.gradient
	if ( attrs.gradient ) {
		const match = findGradient( gradients, attrs.gradient );
		if ( match ) {
			colorStyle.gradient = match.gradient;
			removals.push( 'gradient' );
			changed = true;
		}
	}

	// borderColor  →  style.border.color
	if ( attrs.borderColor ) {
		const match = findColor( colors, attrs.borderColor );
		if ( match ) {
			const borderStyle = style.border || {};
			borderStyle.color = match.color;
			style.border = borderStyle;
			removals.push( 'borderColor' );
			changed = true;
		}
	}

	// Cover block: overlayColor  →  customOverlayColor
	if ( attrs.overlayColor ) {
		const match = findColor( colors, attrs.overlayColor );
		if ( match ) {
			removals.push( 'overlayColor' );
			changed = true;
		}
	}

	// fontSize preset  →  style.typography.fontSize
	if ( attrs.fontSize ) {
		const match = findFontSize( fontSizes, attrs.fontSize );
		if ( match ) {
			const typo = style.typography || {};
			typo.fontSize = typeof match.size === 'number' ? `${ match.size }px` : match.size;
			style.typography = typo;
			removals.push( 'fontSize' );
			changed = true;
		}
	}

	// ── recurse into inner blocks ──────────────────────────────────────
	const resolvedInner = block.innerBlocks.map( ( inner ) =>
		resolveForBlock( inner, colors, gradients, fontSizes )
	);
	const innerChanged = block.innerBlocks.some(
		( inner, i ) => inner !== resolvedInner[ i ]
	);

	if ( ! changed && ! innerChanged ) {
		return block;
	}

	// Build new attributes with palette refs replaced by inline values.
	const newAttributes = { ...attrs };

	if ( changed ) {
		if ( Object.keys( colorStyle ).length > 0 ) {
			style.color = colorStyle;
		}
		newAttributes.style = style;

		// Cover block: store the hex as customOverlayColor.
		if ( attrs.overlayColor ) {
			const match = findColor( colors, attrs.overlayColor );
			if ( match ) {
				newAttributes.customOverlayColor = match.color;
			}
		}

		removals.forEach( ( key ) => delete newAttributes[ key ] );
	}

	// Return a block-like object for serialize() — avoid createBlock()
	// which sanitizes attributes and can strip our changes.
	return {
		...block,
		attributes: newAttributes,
		innerBlocks: resolvedInner,
	};
}
