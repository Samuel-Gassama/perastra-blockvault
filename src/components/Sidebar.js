/**
 * BlockVault sidebar panel for the Gutenberg editor.
 */

import { useEffect, useCallback, useState } from '@wordpress/element';
import {
	Button,
	TextControl,
	SelectControl,
	PanelBody,
	Flex,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { store as noticesStore } from '@wordpress/notices';
import { __ } from '@wordpress/i18n';
import { STORE_NAME } from '../store';
import { useSelectedBlocks } from '../hooks/useSelectedBlocks';
import BlockList from './BlockList';

export default function Sidebar( { onRequestSave } ) {
	const {
		fetchBlocks, setSearchTerm, setCategoryFilter, setSortOrder,
		saveBlock, createCollection, deleteCollection, setCollectionFilter,
	} = useDispatch( STORE_NAME );

	const { createSuccessNotice, createErrorNotice } = useDispatch( noticesStore );

	const {
		searchTerm,
		categoryFilter,
		sortOrder,
		categories,
		collections,
		collectionFilter,
		initialized,
		blockCount,
		blockLimit,
		atLimit,
		plan,
	} = useSelect(
		( select ) => {
			const s = select( STORE_NAME );
			return {
				searchTerm: s.getSearchTerm(),
				categoryFilter: s.getCategoryFilter(),
				sortOrder: s.getSortOrder(),
				categories: s.getCategories(),
				collections: s.getCollections(),
				collectionFilter: s.getCollectionFilter(),
				initialized: s.isInitialized(),
				blockCount: s.getBlockCount(),
				blockLimit: s.getBlockLimit(),
				atLimit: s.isAtLimit(),
				plan: s.getPlan(),
			};
		},
		[]
	);

	const isPaid = plan !== 'free';
	const [ showNewCollection, setShowNewCollection ] = useState( false );
	const [ newCollectionName, setNewCollectionName ] = useState( '' );

	const { hasSelection, blocks } = useSelectedBlocks();

	useEffect( () => {
		if ( ! initialized ) {
			fetchBlocks();
		}
	}, [ initialized, fetchBlocks ] );

	const categoryOptions = [
		{ label: __( 'All Categories', 'perastra-blockvault' ), value: '' },
		{ label: '\u2605 ' + __( 'Favorites', 'perastra-blockvault' ), value: '__favorites__' },
		...categories.map( ( c ) => ( { label: c, value: c } ) ),
	];

	const collectionOptions = [
		{ label: __( 'All Collections', 'perastra-blockvault' ), value: '' },
		...( collections || [] ).map( ( c ) => ( {
			label: `${ c.name } (${ c.block_count || 0 })`,
			value: c.id,
		} ) ),
	];

	const sortOptions = [
		{ label: __( 'Newest First', 'perastra-blockvault' ), value: 'newest' },
		{ label: __( 'Oldest First', 'perastra-blockvault' ), value: 'oldest' },
		{
			label: __( 'Alphabetical (A-Z)', 'perastra-blockvault' ),
			value: 'alpha_asc',
		},
		{
			label: __( 'Alphabetical (Z-A)', 'perastra-blockvault' ),
			value: 'alpha_desc',
		},
	];

	const handleSaveClick = useCallback( () => {
		if ( onRequestSave ) {
			onRequestSave();
		}
	}, [ onRequestSave ] );

	// Duplicate block — save a copy with "(Copy)" suffix.
	const handleDuplicate = useCallback( async ( block ) => {
		try {
			await saveBlock( {
				name: block.name + ' (' + __( 'Copy', 'perastra-blockvault' ) + ')',
				markup: block.markup,
				category: block.category || '',
			} );
		} catch {
			// Store will handle error display.
		}
	}, [ saveBlock ] );

	const handleCreateCollection = async () => {
		if ( ! newCollectionName.trim() ) return;
		try {
			await createCollection( newCollectionName.trim() );
			createSuccessNotice(
				`"${ newCollectionName.trim() }" ${ __( 'collection created.', 'perastra-blockvault' ) }`,
				{ type: 'snackbar' }
			);
			setNewCollectionName( '' );
			setShowNewCollection( false );
		} catch ( error ) {
			createErrorNotice(
				error?.message || __( 'Failed to create collection.', 'perastra-blockvault' ),
				{ type: 'snackbar' }
			);
		}
	};

	const handleDeleteCollection = async ( id ) => {
		// eslint-disable-next-line no-alert
		if ( ! window.confirm( __( 'Delete this collection? Blocks inside will not be deleted.', 'perastra-blockvault' ) ) ) return;
		try {
			await deleteCollection( id );
			createSuccessNotice(
				__( 'Collection deleted.', 'perastra-blockvault' ),
				{ type: 'snackbar' }
			);
		} catch {
			createErrorNotice(
				__( 'Failed to delete collection.', 'perastra-blockvault' ),
				{ type: 'snackbar' }
			);
		}
	};

	return (
		<div className="blockvault-sidebar">
			<PanelBody
				title={ __( 'Save Blocks', 'perastra-blockvault' ) }
				initialOpen
			>
				<Button
					variant="primary"
					disabled={ ! hasSelection }
					onClick={ handleSaveClick }
					className="blockvault-sidebar__save-btn"
				>
					{ hasSelection
						? `${ __( 'Save', 'perastra-blockvault' ) } ${ blocks.length } ${ blocks.length !== 1 ? __( 'Blocks', 'perastra-blockvault' ) : __( 'Block', 'perastra-blockvault' ) } ${ __( 'to Library', 'perastra-blockvault' ) }`
						: __( 'Select blocks to save', 'perastra-blockvault' ) }
				</Button>
				{ ! hasSelection && (
					<p className="blockvault-sidebar__hint">
						{ __(
							'Select one or more blocks in the editor, then click save.',
							'perastra-blockvault'
						) }
					</p>
				) }
			</PanelBody>

			<PanelBody
				title={
					initialized
						? `${ __( 'My Library', 'perastra-blockvault' ) } (${ blockLimit !== Infinity ? `${ blockCount }/${ blockLimit }` : blockCount })`
						: __( 'My Library', 'perastra-blockvault' )
				}
				initialOpen
			>
				<TextControl
					placeholder={ __( 'Search blocks...', 'perastra-blockvault' ) }
					value={ searchTerm }
					onChange={ setSearchTerm }
					className="blockvault-sidebar__search"
				/>

				<div className="blockvault-sidebar__filters">
					{ categories.length > 0 && (
						<SelectControl
							value={ categoryFilter }
							options={ categoryOptions }
							onChange={ setCategoryFilter }
							className="blockvault-sidebar__filter"
							__nextHasNoMarginBottom
						/>
					) }

					{ /* Collections filter — Solo+ */ }
					{ isPaid && collections && collections.length > 0 && (
						<SelectControl
							value={ collectionFilter }
							options={ collectionOptions }
							onChange={ setCollectionFilter }
							className="blockvault-sidebar__filter"
							__nextHasNoMarginBottom
						/>
					) }

					<SelectControl
						value={ sortOrder }
						options={ sortOptions }
						onChange={ setSortOrder }
						className="blockvault-sidebar__filter"
						__nextHasNoMarginBottom
					/>
				</div>

				{ /* Collection management — Solo+ */ }
				{ isPaid && (
					<div className="blockvault-sidebar__collections">
						{ showNewCollection ? (
							<Flex gap={ 2 } align="flex-end" className="blockvault-sidebar__new-collection">
								<TextControl
									placeholder={ __( 'Collection name', 'perastra-blockvault' ) }
									value={ newCollectionName }
									onChange={ setNewCollectionName }
									onKeyDown={ ( e ) => { if ( e.key === 'Enter' ) handleCreateCollection(); if ( e.key === 'Escape' ) setShowNewCollection( false ); } }
									className="blockvault-sidebar__collection-input"
									__nextHasNoMarginBottom
								/>
								<Button
									variant="primary"
									onClick={ handleCreateCollection }
									disabled={ ! newCollectionName.trim() }
									style={ { height: '32px' } }
								>
									{ __( 'Add', 'perastra-blockvault' ) }
								</Button>
								<Button
									variant="tertiary"
									onClick={ () => { setShowNewCollection( false ); setNewCollectionName( '' ); } }
									style={ { height: '32px' } }
								>
									{ __( 'Cancel', 'perastra-blockvault' ) }
								</Button>
							</Flex>
						) : (
							<Flex gap={ 2 } align="center">
								<Button
									variant="tertiary"
									size="small"
									onClick={ () => setShowNewCollection( true ) }
								>
									+ { __( 'New Collection', 'perastra-blockvault' ) }
								</Button>
								{ collectionFilter && (
									<Button
										variant="tertiary"
										size="small"
										isDestructive
										onClick={ () => handleDeleteCollection( collectionFilter ) }
									>
										{ __( 'Delete', 'perastra-blockvault' ) }
									</Button>
								) }
							</Flex>
						) }
					</div>
				) }

				{ blockLimit !== Infinity && initialized && (
					<div
						className={ `blockvault-sidebar__usage${
							atLimit
								? ' blockvault-sidebar__usage--full'
								: ''
						}` }
					>
						<div className="blockvault-sidebar__usage-bar">
							<div
								className="blockvault-sidebar__usage-fill"
								style={ {
									width: `${ Math.min(
										( blockCount / blockLimit ) * 100,
										100
									) }%`,
								} }
							/>
						</div>
						<span className="blockvault-sidebar__usage-text">
							{ blockCount }/{ blockLimit }{ ' ' }
							{ __( 'blocks used', 'perastra-blockvault' ) }
							{ atLimit && (
								<>
									{ ' — ' }
									<a
										href="https://block-vault.com/#pricing"
										target="_blank"
										rel="noopener noreferrer"
									>
										{ __( 'Upgrade', 'perastra-blockvault' ) }
									</a>
								</>
							) }
						</span>
					</div>
				) }

				<BlockList onDuplicate={ handleDuplicate } />
			</PanelBody>
		</div>
	);
}
