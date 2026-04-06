/**
 * Individual block card in the library list.
 */

import { useState, memo } from '@wordpress/element';
import { Button, Flex, FlexBlock, FlexItem } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { parse } from '@wordpress/blocks';
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
	const { deleteBlock, updateBlock, toggleFavorite } = useDispatch( STORE_NAME );
	const { createSuccessNotice, createErrorNotice, createWarningNotice } =
		useDispatch( noticesStore );

	const plan = useSelect( ( sel ) => sel( STORE_NAME ).getPlan() );

	const [ flash, setFlash ] = useState( false );

	const handleInsert = () => {
		try {
			const parsed = parse( block.markup );
			if ( ! parsed || parsed.length === 0 ) {
				createErrorNotice(
					__(
						'Could not parse block markup. The block may be from an unsupported plugin.',
						'blockvault'
					),
					{ type: 'snackbar' }
				);
				return;
			}

			// Inject captured CSS if available.
			if ( block.css ) {
				const styleId = `blockvault-css-${ block.id }`;
				if ( ! document.getElementById( styleId ) ) {
					const style = document.createElement( 'style' );
					style.id = styleId;
					style.textContent = block.css;
					document.head.appendChild( style );
				}
			}

			insertBlocks( parsed );
			setFlash( true );
			setTimeout( () => setFlash( false ), 900 );
			createSuccessNotice(
				`"${ block.name }" ${ __( 'inserted.', 'blockvault' ) }${ block.css ? ' ' + __( '(with styles)', 'blockvault' ) : '' }`,
				{ type: 'snackbar' }
			);
		} catch {
			createErrorNotice(
				__(
					'Failed to insert block. It may require a plugin that is not active on this site.',
					'blockvault'
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
					'blockvault'
				) }`,
				{ type: 'snackbar' }
			);
		} catch {
			createErrorNotice(
				__( 'Failed to delete block.', 'blockvault' ),
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
				__( 'Favorites require a Solo plan or higher.', 'blockvault' ),
				{ type: 'snackbar' }
			);
			return;
		}
		try {
			await toggleFavorite( block.id );
		} catch {
			createErrorNotice( __( 'Failed to update favorite.', 'blockvault' ), { type: 'snackbar' } );
		}
	};

	const [ editDescription, setEditDescription ] = useState( '' );

	const handleEdit = () => {
		setEditName( block.name );
		setEditCategory( block.category || '' );
		setEditDescription( block.description || '' );
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
			createSuccessNotice(
				__( 'Block updated.', 'blockvault' ),
				{ type: 'snackbar' }
			);
			setEditing( false );
		} catch {
			createErrorNotice(
				__( 'Failed to update block.', 'blockvault' ),
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
						placeholder={ __( 'Block name', 'blockvault' ) }
						autoFocus
						onKeyDown={ ( e ) => { if ( e.key === 'Enter' ) handleEditSave(); if ( e.key === 'Escape' ) handleEditCancel(); } }
					/>
					<input
						type="text"
						className="blockvault-block-item__edit-input"
						value={ editCategory }
						onChange={ ( e ) => setEditCategory( e.target.value ) }
						placeholder={ __( 'Category (optional)', 'blockvault' ) }
						onKeyDown={ ( e ) => { if ( e.key === 'Enter' ) handleEditSave(); if ( e.key === 'Escape' ) handleEditCancel(); } }
					/>
					<input
						type="text"
						className="blockvault-block-item__edit-input"
						value={ editDescription }
						onChange={ ( e ) => setEditDescription( e.target.value ) }
						placeholder={ plan === 'free' ? __( 'Notes (Solo+ plan)', 'blockvault' ) : __( 'Notes (optional)', 'blockvault' ) }
						disabled={ plan === 'free' }
						onKeyDown={ ( e ) => { if ( e.key === 'Enter' ) handleEditSave(); if ( e.key === 'Escape' ) handleEditCancel(); } }
					/>
					<Flex gap={ 1 }>
						<Button variant="primary" size="small" onClick={ handleEditSave }>
							{ __( 'Save', 'blockvault' ) }
						</Button>
						<Button variant="tertiary" size="small" onClick={ handleEditCancel }>
							{ __( 'Cancel', 'blockvault' ) }
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
							title={ block.is_favorite ? __( 'Unpin', 'blockvault' ) : __( 'Pin to top', 'blockvault' ) }
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
								? __( 'blocks', 'blockvault' )
								: __( 'block', 'blockvault' ) }
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
								? __( 'Hide preview', 'blockvault' )
								: __( 'Show preview', 'blockvault' ) }
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
							{ __( 'Insert', 'blockvault' ) }
						</Button>
					</FlexItem>
					<FlexItem>
						<Button
							variant="tertiary"
							size="small"
							onClick={ handleEdit }
						>
							{ __( 'Edit', 'blockvault' ) }
						</Button>
					</FlexItem>
					<FlexItem>
						<Button
							variant="tertiary"
							size="small"
							onClick={ handleDuplicate }
						>
							{ __( 'Duplicate', 'blockvault' ) }
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
									{ __( 'Confirm', 'blockvault' ) }
								</Button>
								<Button
									variant="tertiary"
									size="small"
									onClick={ () => setConfirming( false ) }
								>
									{ __( 'Cancel', 'blockvault' ) }
								</Button>
							</Flex>
						) : (
							<Button
								variant="tertiary"
								isDestructive
								size="small"
								onClick={ () => setConfirming( true ) }
							>
								{ __( 'Delete', 'blockvault' ) }
							</Button>
						) }
					</FlexItem>
				</Flex>
			</Flex>
		</div>
	);
} );

export default BlockItem;
