/**
 * Hook to get the currently selected blocks in the editor.
 */

import { useSelect } from '@wordpress/data';
import { serialize } from '@wordpress/blocks';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { resolveBlockColors } from '../utils/resolve-colors';

export function useSelectedBlocks() {
	return useSelect( ( select ) => {
		const { getSelectedBlockClientIds, getBlocksByClientId, getSettings } =
			select( blockEditorStore );

		const clientIds = getSelectedBlockClientIds();

		if ( ! clientIds || clientIds.length === 0 ) {
			return {
				hasSelection: false,
				blocks: [],
				serialized: '',
				blockTypes: [],
				defaultName: '',
			};
		}

		const blocks = getBlocksByClientId( clientIds ).filter( Boolean );

		if ( blocks.length === 0 ) {
			return {
				hasSelection: false,
				blocks: [],
				serialized: '',
				blockTypes: [],
				defaultName: '',
			};
		}

		// Resolve palette colors / font sizes to inline styles so they
		// survive cross-site transfer regardless of the target theme.
		const settings = getSettings();
		const resolved = resolveBlockColors(
			blocks,
			settings.colors || [],
			settings.gradients || [],
			settings.fontSizes || []
		);

		const serialized = serialize( resolved );

		const typeNames = blocks.map( ( b ) => {
			const parts = b.name.split( '/' );
			const name = parts.length > 1 ? parts[ 1 ] : parts[ 0 ];
			return name.charAt( 0 ).toUpperCase() + name.slice( 1 );
		} );

		let defaultName;
		if ( typeNames.length === 1 ) {
			defaultName = typeNames[ 0 ];
		} else if ( typeNames.length === 2 ) {
			defaultName = typeNames.join( ' + ' );
		} else {
			defaultName = `${ typeNames[ 0 ] } + ${ typeNames[ 1 ] } + ${
				typeNames.length - 2
			} more`;
		}

		return {
			hasSelection: true,
			blocks,
			serialized,
			blockTypes: typeNames,
			defaultName,
		};
	} );
	// No dependency array — useSelect subscribes to store changes automatically.
}
