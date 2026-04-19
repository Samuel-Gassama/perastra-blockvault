/**
 * List of saved blocks in the sidebar.
 */

import { memo, useState, useCallback } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { Spinner, Notice, Button, Flex } from '@wordpress/components';
import { store as noticesStore } from '@wordpress/notices';
import { __ } from '@wordpress/i18n';
import { STORE_NAME } from '../store';
import BlockItem from './BlockItem';

const BlockList = memo( function BlockList( { onDuplicate } ) {
	const [ selectedIds, setSelectedIds ] = useState( [] );
	const [ bulkMode, setBulkMode ] = useState( false );
	const [ deleting, setDeleting ] = useState( false );

	const { blocks, loading, initialized, error, searchTerm, categoryFilter } =
		useSelect( ( select ) => {
			const s = select( STORE_NAME );
			return {
				blocks: s.getFilteredBlocks(),
				loading: s.isLoading(),
				initialized: s.isInitialized(),
				error: s.getError(),
				searchTerm: s.getSearchTerm(),
				categoryFilter: s.getCategoryFilter(),
			};
		} );

	const { deleteBlock } = useDispatch( STORE_NAME );
	const { createSuccessNotice, createErrorNotice } = useDispatch( noticesStore );

	const toggleSelect = useCallback( ( id ) => {
		setSelectedIds( ( prev ) =>
			prev.includes( id ) ? prev.filter( ( i ) => i !== id ) : [ ...prev, id ]
		);
	}, [] );

	const handleBulkDelete = async () => {
		if ( selectedIds.length === 0 ) return;
		// eslint-disable-next-line no-alert
		if ( ! window.confirm(
			selectedIds.length === 1
				? __( 'Delete this block? This cannot be undone.', 'perastra-blockvault' )
				: `${ __( 'Delete', 'perastra-blockvault' ) } ${ selectedIds.length } ${ __( 'blocks? This cannot be undone.', 'perastra-blockvault' ) }`
		) ) return;
		setDeleting( true );
		let deleted = 0;
		for ( const id of selectedIds ) {
			try {
				await deleteBlock( id );
				deleted++;
			} catch {
				// continue with remaining
			}
		}
		setDeleting( false );
		setSelectedIds( [] );
		setBulkMode( false );
		if ( deleted > 0 ) {
			createSuccessNotice(
				`${ deleted } ${ deleted !== 1 ? __( 'blocks', 'perastra-blockvault' ) : __( 'block', 'perastra-blockvault' ) } ${ __( 'deleted.', 'perastra-blockvault' ) }`,
				{ type: 'snackbar' }
			);
		}
	};

	const handleSelectAll = () => {
		if ( selectedIds.length === blocks.length ) {
			setSelectedIds( [] );
		} else {
			setSelectedIds( blocks.map( ( b ) => b.id ) );
		}
	};

	if ( loading || ! initialized ) {
		return (
			<div className="blockvault-block-list__loading">
				<Spinner />
			</div>
		);
	}

	if ( error ) {
		return (
			<Notice status="error" isDismissible={ false }>
				{ error }
			</Notice>
		);
	}

	const hasFilters = searchTerm || categoryFilter;

	if ( blocks.length === 0 && hasFilters ) {
		return (
			<div className="blockvault-block-list__empty">
				<p>{ __( 'No blocks match your filters.', 'perastra-blockvault' ) }</p>
				<p className="blockvault-block-list__hint">
					{ __(
						'Try a different search term or category.',
						'perastra-blockvault'
					) }
				</p>
			</div>
		);
	}

	if ( blocks.length === 0 ) {
		return (
			<div className="blockvault-block-list__empty blockvault-onboarding">
				<div className="blockvault-onboarding__icon">
					<svg
						viewBox="0 0 48 48"
						width="48"
						height="48"
						xmlns="http://www.w3.org/2000/svg"
					>
						<rect
							x="4"
							y="8"
							width="40"
							height="32"
							rx="4"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						/>
						<circle
							cx="24"
							cy="24"
							r="8"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						/>
						<circle cx="24" cy="24" r="3" fill="currentColor" />
					</svg>
				</div>
				<p className="blockvault-onboarding__title">
					{ __( 'Your block library is empty', 'perastra-blockvault' ) }
				</p>
				<div className="blockvault-onboarding__steps">
					<p>
						<strong>1.</strong>{ ' ' }
						{ __(
							'Select one or more blocks in the editor',
							'perastra-blockvault'
						) }
					</p>
					<p>
						<strong>2.</strong>{ ' ' }
						{ __(
							'Click "Save to Library" above',
							'perastra-blockvault'
						) }
					</p>
					<p>
						<strong>3.</strong>{ ' ' }
						{ __(
							'Insert saved blocks on any WordPress site',
							'perastra-blockvault'
						) }
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="blockvault-block-list">
			{ blocks.length > 1 && (
				<div className="blockvault-block-list__toolbar">
					{ bulkMode ? (
						<Flex gap={ 2 } align="center">
							<Button
								variant="tertiary"
								size="small"
								onClick={ handleSelectAll }
							>
								{ selectedIds.length === blocks.length
									? __( 'Deselect all', 'perastra-blockvault' )
									: __( 'Select all', 'perastra-blockvault' ) }
							</Button>
							{ selectedIds.length > 0 && (
								<Button
									isDestructive
									size="small"
									isBusy={ deleting }
									onClick={ handleBulkDelete }
								>
									{ `${ __( 'Delete', 'perastra-blockvault' ) } (${ selectedIds.length })` }
								</Button>
							) }
							<Button
								variant="tertiary"
								size="small"
								onClick={ () => { setBulkMode( false ); setSelectedIds( [] ); } }
							>
								{ __( 'Cancel', 'perastra-blockvault' ) }
							</Button>
						</Flex>
					) : (
						<Button
							variant="tertiary"
							size="small"
							onClick={ () => setBulkMode( true ) }
						>
							{ __( 'Select multiple', 'perastra-blockvault' ) }
						</Button>
					) }
				</div>
			) }
			{ blocks.map( ( block ) => (
				<BlockItem
					key={ block.id }
					block={ block }
					selectable={ bulkMode }
					selected={ selectedIds.includes( block.id ) }
					onToggleSelect={ toggleSelect }
					onDuplicate={ onDuplicate }
				/>
			) ) }
		</div>
	);
} );

export default BlockList;
