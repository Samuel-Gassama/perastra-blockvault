/**
 * BlockVault sidebar panel for the Gutenberg editor.
 */

import { useEffect, useCallback, useState } from '@wordpress/element';
import {
	Button,
	TextControl,
	SelectControl,
	PanelBody,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { STORE_NAME } from '../store';
import { useSelectedBlocks } from '../hooks/useSelectedBlocks';
import BlockList from './BlockList';

export default function Sidebar( { onRequestSave } ) {
	const { fetchBlocks, setSearchTerm, setCategoryFilter, setSortOrder, saveBlock } =
		useDispatch( STORE_NAME );

	const {
		searchTerm,
		categoryFilter,
		sortOrder,
		categories,
		initialized,
		blockCount,
		blockLimit,
		atLimit,
	} = useSelect(
		( select ) => {
			const s = select( STORE_NAME );
			return {
				searchTerm: s.getSearchTerm(),
				categoryFilter: s.getCategoryFilter(),
				sortOrder: s.getSortOrder(),
				categories: s.getCategories(),
				initialized: s.isInitialized(),
				blockCount: s.getBlockCount(),
				blockLimit: s.getBlockLimit(),
				atLimit: s.isAtLimit(),
			};
		},
		[]
	);

	const { hasSelection, blocks } = useSelectedBlocks();

	useEffect( () => {
		if ( ! initialized ) {
			fetchBlocks();
		}
	}, [ initialized, fetchBlocks ] );

	const categoryOptions = [
		{ label: __( 'All Categories', 'blockvault' ), value: '' },
		...categories.map( ( c ) => ( { label: c, value: c } ) ),
	];

	const sortOptions = [
		{ label: __( 'Newest First', 'blockvault' ), value: 'newest' },
		{ label: __( 'Oldest First', 'blockvault' ), value: 'oldest' },
		{
			label: __( 'Alphabetical (A-Z)', 'blockvault' ),
			value: 'alpha_asc',
		},
		{
			label: __( 'Alphabetical (Z-A)', 'blockvault' ),
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
				name: block.name + ' (' + __( 'Copy', 'blockvault' ) + ')',
				markup: block.markup,
				category: block.category || '',
			} );
		} catch {
			// Store will handle error display.
		}
	}, [ saveBlock ] );


	return (
		<div className="blockvault-sidebar">
			<PanelBody
				title={ __( 'Save Blocks', 'blockvault' ) }
				initialOpen
			>
				<Button
					variant="primary"
					disabled={ ! hasSelection }
					onClick={ handleSaveClick }
					className="blockvault-sidebar__save-btn"
				>
					{ hasSelection
						? `${ __( 'Save', 'blockvault' ) } ${ blocks.length } ${ blocks.length !== 1 ? __( 'Blocks', 'blockvault' ) : __( 'Block', 'blockvault' ) } ${ __( 'to Library', 'blockvault' ) }`
						: __( 'Select blocks to save', 'blockvault' ) }
				</Button>
				{ ! hasSelection && (
					<p className="blockvault-sidebar__hint">
						{ __(
							'Select one or more blocks in the editor, then click save.',
							'blockvault'
						) }
					</p>
				) }
			</PanelBody>

			<PanelBody
				title={ __( 'My Library', 'blockvault' ) }
				initialOpen
			>
				<TextControl
					placeholder={ __( 'Search blocks...', 'blockvault' ) }
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
					<SelectControl
						value={ sortOrder }
						options={ sortOptions }
						onChange={ setSortOrder }
						className="blockvault-sidebar__filter"
						__nextHasNoMarginBottom
					/>
				</div>

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
							{ __( 'blocks used', 'blockvault' ) }
							{ atLimit && (
								<>
									{ ' — ' }
									<a
										href="https://block-vault.com/#pricing"
										target="_blank"
										rel="noopener noreferrer"
									>
										{ __( 'Upgrade', 'blockvault' ) }
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
