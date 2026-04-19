/**
 * Individual block card in the library list.
 */

import { useState, memo } from '@wordpress/element';
import { Button, Flex, FlexBlock, FlexItem } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { parse, createBlock } from '@wordpress/blocks';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { store as noticesStore } from '@wordpress/notices';
import { __ } from '@wordpress/i18n';
import { STORE_NAME } from '../store';

/**
 * Generate a short plain-text preview from block markup.
 */
function getMarkupPreview( markup ) {
	if ( ! markup ) {
		return '';
	}
	// Strip HTML tags and block comments to get visible text content.
	const text = markup
		.replace( /<!--.*?-->/gs, '' )
		.replace( /<[^>]*>/g, ' ' )
		.replace( /\s+/g, ' ' )
		.trim();
	if ( ! text ) {
		return '';
	}
	return text.length > 120 ? text.slice( 0, 120 ) + '...' : text;
}

const BlockItem = memo( function BlockItem( { block, selectable, selected, onToggleSelect, onDuplicate } ) {
	const [ confirming, setConfirming ] = useState( false );
	const [ expanded, setExpanded ] = useState( false );
	const [ editing, setEditing ] = useState( false );
	const [ editName, setEditName ] = useState( '' );
	const [ editCategory, setEditCategory ] = useState( '' );

	const { insertBlocks } = useDispatch( blockEditorStore );
	const { deleteBlock, updateBlock, toggleFavorite, addBlockToCollection, removeBlockFromCollection } = useDispatch( STORE_NAME );
	const { createSuccessNotice, createErrorNotice, createWarningNotice } =
		useDispatch( noticesStore );

	const { plan, collections } = useSelect( ( sel ) => ( {
		plan: sel( STORE_NAME ).getPlan(),
		collections: sel( STORE_NAME ).getCollections(),
	} ) );

	const [ flash, setFlash ] = useState( false );

	const handleInsert = () => {
		try {
			const parsed = parse( block.markup );
			if ( ! parsed || parsed.length === 0 ) {
				createErrorNotice(
					__(
						'Could not parse block markup. The block may be from an unsupported plugin.',
						'perastra-blockvault'
					),
					{ type: 'snackbar' }
				);
				return;
			}

			// If there's responsive/interactive CSS, inject it:
			// 1. As a <style> tag in the editor for immediate preview.
			// 2. As a Custom HTML block for the frontend.
			if ( block.css ) {
				const styleBlock = createBlock( 'core/html', {
					content: `<style>/* BlockVault: ${ block.name } */\n${ block.css }\n</style>`,
					metadata: { name: `${ block.name } — CSS` },
				} );
				insertBlocks( [ styleBlock, ...parsed ] );

				// Also inject into editor head for immediate preview.
				const styleId = `blockvault-css-${ block.id }`;
				if ( ! document.getElementById( styleId ) ) {
					const style = document.createElement( 'style' );
					style.id = styleId;
					style.textContent = block.css;
					document.head.appendChild( style );
				}
			} else {
				insertBlocks( parsed );
			}
			setFlash( true );
			setTimeout( () => setFlash( false ), 900 );
			createSuccessNotice(
				`"${ block.name }" ${ __( 'inserted.', 'perastra-blockvault' ) }${ block.css ? ' ' + __( '(with styles)', 'perastra-blockvault' ) : '' }`,
				{ type: 'snackbar' }
			);
		} catch {
			createErrorNotice(
				__(
					'Failed to insert block. It may require a plugin that is not active on this site.',
					'perastra-blockvault'
				),
				{ type: 'snackbar' }
			);
		}
	};

	const handleDelete = async () => {
		try {
			await deleteBlock( block.id );
			createSuccessNotice(
				`"${ block.name }" ${ __(
					'removed from library.',
					'perastra-blockvault'
				) }`,
				{ type: 'snackbar' }
			);
		} catch {
			createErrorNotice(
				__( 'Failed to delete block.', 'perastra-blockvault' ),
				{ type: 'snackbar' }
			);
		}
		setConfirming( false );
	};

	const dateStr = new Date( block.created_at ).toLocaleDateString(
		undefined,
		{ month: 'short', day: 'numeric' }
	);

	const preview = getMarkupPreview( block.markup );

	const handleFavorite = async () => {
		if ( plan === 'free' ) {
			createWarningNotice(
				__( 'Favorites require a Solo plan or higher.', 'perastra-blockvault' ),
				{ type: 'snackbar' }
			);
			return;
		}
		try {
			await toggleFavorite( block.id );
		} catch {
			createErrorNotice( __( 'Failed to update favorite.', 'perastra-blockvault' ), { type: 'snackbar' } );
		}
	};

	const [ editDescription, setEditDescription ] = useState( '' );
	const [ editCollection, setEditCollection ] = useState( '' );

	const handleEdit = () => {
		setEditName( block.name );
		setEditCategory( block.category || '' );
		setEditDescription( block.description || '' );
		// Pre-populate with the block's current collection (first one, since the UI is single-select).
		const currentCollectionId = Array.isArray( block.collection_ids ) && block.collection_ids.length > 0
			? block.collection_ids[ 0 ]
			: '';
		setEditCollection( currentCollectionId );
		setEditing( true );
	};

	const handleEditSave = async () => {
		if ( ! editName.trim() ) return;
		try {
			const data = {
				name: editName.trim(),
				category: editCategory.trim(),
			};
			if ( plan !== 'free' ) {
				data.description = editDescription.trim();
			}
			await updateBlock( block.id, data );

			// Sync collection membership on paid plans.
			// Treats the single-select UI as "the collection for this block":
			// - if the selection differs from current, remove from old collection(s) and add to the new one.
			// - if the selection is empty, remove from all collections.
			if ( plan !== 'free' ) {
				const currentIds = Array.isArray( block.collection_ids ) ? block.collection_ids : [];
				const isInSelected = editCollection && currentIds.includes( editCollection );

				if ( ! isInSelected ) {
					// Remove from any existing collections.
					for ( const id of currentIds ) {
						await removeBlockFromCollection( id, block.id );
					}
					// Add to the newly selected one (if any).
					if ( editCollection ) {
						await addBlockToCollection( editCollection, block.id );
					}
				}
			}

			createSuccessNotice(
				__( 'Block updated.', 'perastra-blockvault' ),
				{ type: 'snackbar' }
			);
			setEditing( false );
		} catch {
			createErrorNotice(
				__( 'Failed to update block.', 'perastra-blockvault' ),
				{ type: 'snackbar' }
			);
		}
	};

	const handleEditCancel = () => {
		setEditing( false );
	};

	const handleDuplicate = () => {
		if ( onDuplicate ) {
			onDuplicate( block );
		}
	};

	if ( editing ) {
		return (
			<div className="blockvault-block-item blockvault-block-item--editing">
				<div className="blockvault-block-item__edit-form">
					<input
						type="text"
						className="blockvault-block-item__edit-input"
						value={ editName }
						onChange={ ( e ) => setEditName( e.target.value ) }
						placeholder={ __( 'Block name', 'perastra-blockvault' ) }
						autoFocus
						onKeyDown={ ( e ) => { if ( e.key === 'Enter' ) handleEditSave(); if ( e.key === 'Escape' ) handleEditCancel(); } }
					/>
					<input
						type="text"
						className="blockvault-block-item__edit-input"
						value={ editCategory }
						onChange={ ( e ) => setEditCategory( e.target.value ) }
						placeholder={ __( 'Category (optional)', 'perastra-blockvault' ) }
						onKeyDown={ ( e ) => { if ( e.key === 'Enter' ) handleEditSave(); if ( e.key === 'Escape' ) handleEditCancel(); } }
					/>
					<input
						type="text"
						className="blockvault-block-item__edit-input"
						value={ editDescription }
						onChange={ ( e ) => setEditDescription( e.target.value ) }
						placeholder={ plan === 'free' ? __( 'Notes (Solo+ plan)', 'perastra-blockvault' ) : __( 'Notes (optional)', 'perastra-blockvault' ) }
						disabled={ plan === 'free' }
						onKeyDown={ ( e ) => { if ( e.key === 'Enter' ) handleEditSave(); if ( e.key === 'Escape' ) handleEditCancel(); } }
					/>
					{ plan !== 'free' && collections && collections.length > 0 && (
						<select
							className="blockvault-block-item__edit-input"
							value={ editCollection }
							onChange={ ( e ) => setEditCollection( e.target.value ) }
							aria-label={ __( 'Collection', 'perastra-blockvault' ) }
						>
							<option value="">{ __( 'No collection', 'perastra-blockvault' ) }</option>
							{ collections.map( ( c ) => (
								<option key={ c.id } value={ c.id }>{ c.name }</option>
							) ) }
						</select>
					) }
					<Flex gap={ 1 }>
						<Button variant="primary" size="small" onClick={ handleEditSave }>
							{ __( 'Save', 'perastra-blockvault' ) }
						</Button>
						<Button variant="tertiary" size="small" onClick={ handleEditCancel }>
							{ __( 'Cancel', 'perastra-blockvault' ) }
						</Button>
					</Flex>
				</div>
			</div>
		);
	}

	return (
		<div className={ `blockvault-block-item${ selected ? ' blockvault-block-item--selected' : '' }${ flash ? ' blockvault-block-item--flash' : '' }` }>
			<Flex direction="column" gap={ 1 }>
				<FlexBlock>
					<div className="blockvault-block-item__header">
						{ selectable && (
							<input
								type="checkbox"
								className="blockvault-block-item__checkbox"
								checked={ selected }
								onChange={ () => onToggleSelect( block.id ) }
							/>
						) }
						<div className="blockvault-block-item__name">
							{ block.name }
						</div>
						<button
							type="button"
							className={ `blockvault-block-item__favorite${ block.is_favorite ? ' is-active' : '' }` }
							onClick={ handleFavorite }
							title={ block.is_favorite ? __( 'Unpin', 'perastra-blockvault' ) : __( 'Pin to top', 'perastra-blockvault' ) }
						>
							{ block.is_favorite ? '\u2605' : '\u2606' }
						</button>
					</div>
					{ block.description && (
						<div className="blockvault-block-item__description">
							{ block.description }
						</div>
					) }
					<div className="blockvault-block-item__meta">
						<span>
							{ block.block_count }{ ' ' }
							{ block.block_count !== 1
								? __( 'blocks', 'perastra-blockvault' )
								: __( 'block', 'perastra-blockvault' ) }
						</span>
						{ block.category && (
							<span className="blockvault-block-item__category">
								{ block.category }
							</span>
						) }
						<span className="blockvault-block-item__date">
							{ dateStr }
						</span>
					</div>

					{ preview && (
						<button
							type="button"
							className="blockvault-block-item__preview-toggle"
							onClick={ () => setExpanded( ! expanded ) }
						>
							{ expanded
								? __( 'Hide preview', 'perastra-blockvault' )
								: __( 'Show preview', 'perastra-blockvault' ) }
						</button>
					) }
					{ expanded && preview && (
						<div className="blockvault-block-item__preview">
							{ preview }
						</div>
					) }
				</FlexBlock>

				<Flex gap={ 2 } justify="flex-start" wrap>
					<FlexItem>
						<Button
							variant="primary"
							size="small"
							onClick={ handleInsert }
						>
							{ __( 'Insert', 'perastra-blockvault' ) }
						</Button>
					</FlexItem>
					<FlexItem>
						<Button
							variant="tertiary"
							size="small"
							onClick={ handleEdit }
						>
							{ __( 'Edit', 'perastra-blockvault' ) }
						</Button>
					</FlexItem>
					<FlexItem>
						<Button
							variant="tertiary"
							size="small"
							onClick={ handleDuplicate }
						>
							{ __( 'Duplicate', 'perastra-blockvault' ) }
						</Button>
					</FlexItem>
					<FlexItem>
						{ confirming ? (
							<Flex gap={ 1 }>
								<Button
									isDestructive
									size="small"
									onClick={ handleDelete }
								>
									{ __( 'Confirm', 'perastra-blockvault' ) }
								</Button>
								<Button
									variant="tertiary"
									size="small"
									onClick={ () => setConfirming( false ) }
								>
									{ __( 'Cancel', 'perastra-blockvault' ) }
								</Button>
							</Flex>
						) : (
							<Button
								variant="tertiary"
								isDestructive
								size="small"
								onClick={ () => setConfirming( true ) }
							>
								{ __( 'Delete', 'perastra-blockvault' ) }
							</Button>
						) }
					</FlexItem>
				</Flex>
			</Flex>
		</div>
	);
} );

export default BlockItem;
