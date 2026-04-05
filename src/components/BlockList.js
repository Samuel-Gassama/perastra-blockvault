/**
 * List of saved blocks in the sidebar.
 */

import { memo } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { Spinner, Notice } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { STORE_NAME } from '../store';
import BlockItem from './BlockItem';

const BlockList = memo( function BlockList() {
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
				<p>{ __( 'No blocks match your filters.', 'blockvault' ) }</p>
				<p className="blockvault-block-list__hint">
					{ __(
						'Try a different search term or category.',
						'blockvault'
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
					{ __( 'Your block library is empty', 'blockvault' ) }
				</p>
				<div className="blockvault-onboarding__steps">
					<p>
						<strong>1.</strong>{ ' ' }
						{ __(
							'Select one or more blocks in the editor',
							'blockvault'
						) }
					</p>
					<p>
						<strong>2.</strong>{ ' ' }
						{ __(
							'Click "Save to Library" above',
							'blockvault'
						) }
					</p>
					<p>
						<strong>3.</strong>{ ' ' }
						{ __(
							'Insert saved blocks on any WordPress site',
							'blockvault'
						) }
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="blockvault-block-list">
			{ blocks.map( ( block ) => (
				<BlockItem key={ block.id } block={ block } />
			) ) }
		</div>
	);
} );

export default BlockList;
