/**
 * BlockVault data store.
 */

import { createReduxStore, register } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import * as api from '../api/client';

const DEFAULT_STATE = {
	blocks: [],
	blockLimit: 10,
	plan: 'free',
	collections: [],
	collectionFilter: '',
	loading: false,
	saving: false,
	searchTerm: '',
	categoryFilter: '',
	sortOrder: 'newest',
	initialized: false,
	error: '',
};

const STORE_NAME = 'perastra-blockvault/library';

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
			case 'UPDATE_BLOCK':
				// Merge (not replace) so fields the PATCH response omits
				// — e.g. `collection_ids`, which is only hydrated on GET
				// /blocks via a separate junction-table join — survive the
				// update. Without this merge, toggling favorite / editing
				// a block strips its collection membership from local state
				// and it disappears from any active collection filter until
				// a full refetch.
				return {
					...state,
					blocks: state.blocks.map( ( b ) =>
						b.id === action.block.id ? { ...b, ...action.block } : b
					),
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
			case 'SET_PLAN':
				return { ...state, plan: action.plan };
			case 'SET_COLLECTIONS':
				return { ...state, collections: action.collections };
			case 'ADD_COLLECTION':
				return { ...state, collections: [ ...state.collections, action.collection ] };
			case 'REMOVE_COLLECTION': {
				const newCollections = state.collections.filter( ( c ) => c.id !== action.id );
				const cf = state.collectionFilter === action.id ? '' : state.collectionFilter;
				// Strip the deleted collection id from every block's collection_ids.
				const blocks = state.blocks.map( ( b ) => {
					if ( ! Array.isArray( b.collection_ids ) || ! b.collection_ids.includes( action.id ) ) return b;
					return { ...b, collection_ids: b.collection_ids.filter( ( id ) => id !== action.id ) };
				} );
				return { ...state, blocks, collections: newCollections, collectionFilter: cf };
			}
			case 'SET_COLLECTION_FILTER':
				return { ...state, collectionFilter: action.collectionFilter };
			case 'TOGGLE_FAVORITE':
				return {
					...state,
					blocks: state.blocks.map( ( b ) =>
						b.id === action.id ? { ...b, is_favorite: ! b.is_favorite } : b
					),
				};
			case 'ADD_BLOCK_TO_COLLECTION':
				return {
					...state,
					blocks: state.blocks.map( ( b ) => {
						if ( b.id !== action.blockId ) return b;
						const existing = Array.isArray( b.collection_ids ) ? b.collection_ids : [];
						if ( existing.includes( action.collectionId ) ) return b;
						return { ...b, collection_ids: [ ...existing, action.collectionId ] };
					} ),
				};
			case 'REMOVE_BLOCK_FROM_COLLECTION':
				return {
					...state,
					blocks: state.blocks.map( ( b ) => {
						if ( b.id !== action.blockId ) return b;
						const existing = Array.isArray( b.collection_ids ) ? b.collection_ids : [];
						return { ...b, collection_ids: existing.filter( ( id ) => id !== action.collectionId ) };
					} ),
				};
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

					const [ blocks, blockLimit, collections, accountInfo ] = await Promise.all( [
						api.getBlocks(),
						api.getBlockLimit(),
						api.getCollections().catch( () => [] ),
						api.getAccountInfo().catch( () => null ),
					] );
					dispatch( { type: 'SET_BLOCKS', blocks } );
					dispatch( { type: 'SET_BLOCK_LIMIT', blockLimit } );
					dispatch( { type: 'SET_COLLECTIONS', collections } );

					// Set plan from API (most accurate), fallback to PHP setting.
					/* global perastraBlockvaultSettings */
					const plan = accountInfo?.plan || perastraBlockvaultSettings?.plan || 'free';
					dispatch( { type: 'SET_PLAN', plan } );
				} catch ( error ) {
					const message =
						error?.message ||
						__(
							'Failed to load your block library.',
							'perastra-blockvault'
						);
					dispatch( { type: 'SET_ERROR', error: message } );
					// eslint-disable-next-line no-console
					console.error( 'BlockVault: Failed to fetch blocks', error );
				} finally {
					dispatch( { type: 'SET_LOADING', loading: false } );
				}
			};
		},

		saveBlock( data ) {
			return async ( { dispatch } ) => {
				dispatch( { type: 'SET_SAVING', saving: true } );
				try {
					const block = await api.saveBlock( data );
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

		updateBlock( id, data ) {
			return async ( { dispatch } ) => {
				try {
					const block = await api.updateBlock( id, data );
					dispatch( { type: 'UPDATE_BLOCK', block } );
					return block;
				} catch ( error ) {
					// eslint-disable-next-line no-console
					console.error( 'BlockVault: Failed to update block', error );
					throw error;
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

		toggleFavorite( id ) {
			return async ( { dispatch, select } ) => {
				try {
					const blocks = select.getBlocks();
					const current = blocks.find( ( b ) => b.id === id );
					const newValue = ! ( current?.is_favorite );
					const block = await api.updateBlock( id, { is_favorite: newValue } );
					dispatch( { type: 'UPDATE_BLOCK', block } );
				} catch ( error ) {
					console.error( 'BlockVault: Failed to toggle favorite', error );
					throw error;
				}
			};
		},

		createCollection( name ) {
			return async ( { dispatch } ) => {
				const collection = await api.createCollection( name );
				dispatch( { type: 'ADD_COLLECTION', collection } );
				return collection;
			};
		},

		deleteCollection( id ) {
			return async ( { dispatch } ) => {
				await api.deleteCollection( id );
				dispatch( { type: 'REMOVE_COLLECTION', id } );
			};
		},

		addBlockToCollection( collectionId, blockId ) {
			return async ( { dispatch } ) => {
				await api.addBlockToCollection( collectionId, blockId );
				dispatch( { type: 'ADD_BLOCK_TO_COLLECTION', collectionId, blockId } );
			};
		},

		removeBlockFromCollection( collectionId, blockId ) {
			return async ( { dispatch } ) => {
				await api.removeBlockFromCollection( collectionId, blockId );
				dispatch( { type: 'REMOVE_BLOCK_FROM_COLLECTION', collectionId, blockId } );
			};
		},

		setCollectionFilter( collectionFilter ) {
			return { type: 'SET_COLLECTION_FILTER', collectionFilter };
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
			const { searchTerm, categoryFilter, sortOrder, collectionFilter } = state;

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
				if ( categoryFilter === '__favorites__' ) {
					blocks = blocks.filter( ( b ) => b.is_favorite );
				} else {
					blocks = blocks.filter(
						( b ) => b.category === categoryFilter
					);
				}
			}

			if ( collectionFilter ) {
				blocks = blocks.filter(
					( b ) =>
						Array.isArray( b.collection_ids ) &&
						b.collection_ids.includes( collectionFilter )
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

			// Favorites sort to the top.
				blocks.sort( ( a, b ) => {
					if ( a.is_favorite && ! b.is_favorite ) return -1;
					if ( ! a.is_favorite && b.is_favorite ) return 1;
					return 0;
				} );

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

		getPlan( state ) {
			return ( state.plan || 'free' ).replace( 'lifetime_', '' );
		},

		isPaidPlan( state ) {
			return ( state.plan || 'free' ).replace( 'lifetime_', '' ) !== 'free';
		},

		getCollections( state ) {
			return state.collections;
		},

		getCollectionFilter( state ) {
			return state.collectionFilter;
		},

		getError( state ) {
			return state.error;
		},
	},
} );

register( store );

export { STORE_NAME };
export default store;
