/**
 * BlockVault data store.
 */

import { createReduxStore, register } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import * as api from '../api/client';

const DEFAULT_STATE = {
	blocks: [],
	blockLimit: 10,
	loading: false,
	saving: false,
	searchTerm: '',
	categoryFilter: '',
	sortOrder: 'newest',
	initialized: false,
	error: '',
};

const STORE_NAME = 'blockvault/library';

const store = createReduxStore( STORE_NAME, {
	reducer( state = DEFAULT_STATE, action ) {
		switch ( action.type ) {
			case 'SET_BLOCKS':
				return {
					...state,
					blocks: action.blocks,
					initialized: true,
					error: '',
				};
			case 'ADD_BLOCK':
				return {
					...state,
					blocks: [ action.block, ...state.blocks ],
					error: '',
				};
			case 'REMOVE_BLOCK': {
				const newBlocks = state.blocks.filter(
					( b ) => b.id !== action.id
				);
				// Auto-reset category filter if the selected category no longer exists.
				const remainingCats = new Set(
					newBlocks.map( ( b ) => b.category ).filter( Boolean )
				);
				const categoryFilter =
					state.categoryFilter &&
					! remainingCats.has( state.categoryFilter )
						? ''
						: state.categoryFilter;
				return { ...state, blocks: newBlocks, categoryFilter };
			}
			case 'SET_LOADING':
				return { ...state, loading: action.loading };
			case 'SET_SAVING':
				return { ...state, saving: action.saving };
			case 'SET_SEARCH_TERM':
				return { ...state, searchTerm: action.searchTerm };
			case 'SET_CATEGORY_FILTER':
				return { ...state, categoryFilter: action.categoryFilter };
			case 'SET_SORT_ORDER':
				return { ...state, sortOrder: action.sortOrder };
			case 'SET_BLOCK_LIMIT':
				return { ...state, blockLimit: action.blockLimit };
			case 'SET_ERROR':
				return { ...state, error: action.error };
			default:
				return state;
		}
	},

	actions: {
		fetchBlocks() {
			return async ( { dispatch } ) => {
				dispatch( { type: 'SET_LOADING', loading: true } );
				dispatch( { type: 'SET_ERROR', error: '' } );
				try {
					// Migrate local blocks to cloud on first load after API key is set.
					await api.migrateLocalToCloud();

					const [ blocks, blockLimit ] = await Promise.all( [
						api.getBlocks(),
						api.getBlockLimit(),
					] );
					dispatch( { type: 'SET_BLOCKS', blocks } );
					dispatch( {
						type: 'SET_BLOCK_LIMIT',
						blockLimit,
					} );
				} catch ( error ) {
					const message =
						error?.message ||
						__(
							'Failed to load your block library.',
							'blockvault'
						);
					dispatch( { type: 'SET_ERROR', error: message } );
					// eslint-disable-next-line no-console
					console.error( 'BlockVault: Failed to fetch blocks', error );
				} finally {
					dispatch( { type: 'SET_LOADING', loading: false } );
				}
			};
		},

		saveBlock( { name, markup, category } ) {
			return async ( { dispatch } ) => {
				dispatch( { type: 'SET_SAVING', saving: true } );
				try {
					const block = await api.saveBlock( {
						name,
						markup,
						category,
					} );
					dispatch( { type: 'ADD_BLOCK', block } );
					return block;
				} catch ( error ) {
					// eslint-disable-next-line no-console
					console.error(
						'BlockVault: Failed to save block',
						error
					);
					throw error;
				} finally {
					dispatch( { type: 'SET_SAVING', saving: false } );
				}
			};
		},

		deleteBlock( id ) {
			return async ( { dispatch } ) => {
				try {
					await api.deleteBlock( id );
					dispatch( { type: 'REMOVE_BLOCK', id } );
				} catch ( error ) {
					// eslint-disable-next-line no-console
					console.error(
						'BlockVault: Failed to delete block',
						error
					);
					throw error;
				}
			};
		},

		setSearchTerm( searchTerm ) {
			return { type: 'SET_SEARCH_TERM', searchTerm };
		},

		setCategoryFilter( categoryFilter ) {
			return { type: 'SET_CATEGORY_FILTER', categoryFilter };
		},

		setSortOrder( sortOrder ) {
			return { type: 'SET_SORT_ORDER', sortOrder };
		},
	},

	selectors: {
		getBlocks( state ) {
			return state.blocks;
		},

		getFilteredBlocks( state ) {
			let { blocks } = state;
			const { searchTerm, categoryFilter, sortOrder } = state;

			if ( searchTerm ) {
				const term = searchTerm.toLowerCase();
				blocks = blocks.filter(
					( b ) =>
						b.name.toLowerCase().includes( term ) ||
						( b.category &&
							b.category.toLowerCase().includes( term ) )
				);
			}

			if ( categoryFilter ) {
				blocks = blocks.filter(
					( b ) => b.category === categoryFilter
				);
			}

			// Sort blocks.
			blocks = [ ...blocks ];
			switch ( sortOrder ) {
				case 'oldest':
					blocks.sort(
						( a, b ) =>
							new Date( a.created_at ) -
							new Date( b.created_at )
					);
					break;
				case 'alpha_asc':
					blocks.sort( ( a, b ) =>
						a.name.localeCompare( b.name )
					);
					break;
				case 'alpha_desc':
					blocks.sort( ( a, b ) =>
						b.name.localeCompare( a.name )
					);
					break;
				case 'newest':
				default:
					blocks.sort(
						( a, b ) =>
							new Date( b.created_at ) -
							new Date( a.created_at )
					);
					break;
			}

			return blocks;
		},

		getCategories( state ) {
			const cats = [
				...new Set(
					state.blocks
						.map( ( b ) => b.category )
						.filter( Boolean )
				),
			];
			return cats.sort();
		},

		isLoading( state ) {
			return state.loading;
		},

		isSaving( state ) {
			return state.saving;
		},

		isInitialized( state ) {
			return state.initialized;
		},

		getSearchTerm( state ) {
			return state.searchTerm;
		},

		getCategoryFilter( state ) {
			return state.categoryFilter;
		},

		getSortOrder( state ) {
			return state.sortOrder;
		},

		getBlockLimit( state ) {
			return state.blockLimit;
		},

		getBlockCount( state ) {
			return state.blocks.length;
		},

		isAtLimit( state ) {
			return (
				state.blockLimit !== Infinity &&
				state.blocks.length >= state.blockLimit
			);
		},

		getError( state ) {
			return state.error;
		},
	},
} );

register( store );

export { STORE_NAME };
export default store;
