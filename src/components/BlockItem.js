/**
 * Individual block card in the library list.
 */

import { useState, memo } from '@wordpress/element';
import { Button, Flex, FlexBlock, FlexItem } from '@wordpress/components';
import { useDispatch } from '@wordpress/data';
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

	const { insertBlocks } = useDispatch( blockEditorStore );
	const { deleteBlock } = useDispatch( STORE_NAME );
	const { createSuccessNotice, createErrorNotice } =
		useDispatch( noticesStore );

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
			insertBlocks( parsed );
			createSuccessNotice(
				/* translators: %s: block name */
				`"${ block.name }" ${ __( 'inserted.', 'blockvault' ) }`,
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

	const handleDuplicate = () => {
		if ( onDuplicate ) {
			onDuplicate( block );
		}
	};

	return (
		<div className={ `blockvault-block-item${ selected ? ' blockvault-block-item--selected' : '' }` }>
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
					</div>
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
