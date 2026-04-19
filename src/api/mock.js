/**
 * Mock API client using localStorage.
 * Same interface as the real client so swapping is a one-line change.
 */

import { __ } from '@wordpress/i18n';

const STORAGE_KEY = 'perastra_blockvault_blocks';
const FREE_BLOCK_LIMIT = 10;

function delay( ms = 300 ) {
	return new Promise( ( resolve ) => setTimeout( resolve, ms ) );
}

function generateId() {
	return (
		'bv_' +
		Date.now().toString( 36 ) +
		'_' +
		Math.random().toString( 36 ).slice( 2, 8 )
	);
}

function getStoredBlocks() {
	try {
		const raw = localStorage.getItem( STORAGE_KEY );
		if ( ! raw ) {
			return [];
		}
		const parsed = JSON.parse( raw );
		if ( ! Array.isArray( parsed ) ) {
			// eslint-disable-next-line no-console
			console.warn( 'BlockVault: Invalid data in localStorage, resetting.' );
			localStorage.removeItem( STORAGE_KEY );
			return [];
		}
		return parsed;
	} catch ( e ) {
		// eslint-disable-next-line no-console
		console.warn( 'BlockVault: Corrupt data in localStorage, resetting.', e );
		localStorage.removeItem( STORAGE_KEY );
		return [];
	}
}

function setStoredBlocks( blocks ) {
	try {
		localStorage.setItem( STORAGE_KEY, JSON.stringify( blocks ) );
	} catch ( e ) {
		if (
			e instanceof DOMException &&
			( e.name === 'QuotaExceededError' ||
				e.code === 22 ||
				e.code === 1014 )
		) {
			throw new Error(
				__(
					'Browser storage is full. Delete some blocks or connect a BlockVault cloud account for unlimited storage.',
					'perastra-blockvault'
				)
			);
		}
		throw e;
	}
}

export async function getBlocks() {
	await delay( 150 );
	return getStoredBlocks();
}

export async function getBlockLimit() {
	return FREE_BLOCK_LIMIT;
}

export async function saveBlock( { name, markup, category = '' } ) {
	await delay( 300 );
	const blocks = getStoredBlocks();

	if ( blocks.length >= FREE_BLOCK_LIMIT ) {
		throw new Error(
			__(
				'Free plan limit reached. Connect a BlockVault account for unlimited blocks.',
				'perastra-blockvault'
			)
		);
	}

	const newBlock = {
		id: generateId(),
		name,
		markup,
		category,
		description: '',
		is_favorite: false,
		block_count: ( markup.match( /<!-- wp:/g ) || [] ).length,
		created_at: new Date().toISOString(),
	};
	blocks.unshift( newBlock );
	setStoredBlocks( blocks );
	return newBlock;
}

export async function updateBlock( id, data ) {
	await delay( 200 );
	const blocks = getStoredBlocks();
	const index = blocks.findIndex( ( b ) => b.id === id );
	if ( index === -1 ) {
		throw new Error( __( 'Block not found.', 'perastra-blockvault' ) );
	}
	if ( data.name !== undefined ) blocks[ index ].name = data.name.trim();
	if ( data.category !== undefined ) blocks[ index ].category = ( data.category || '' ).trim();
	// Notes and favorites are paid features — silently ignore in local mode.
	setStoredBlocks( blocks );
	return blocks[ index ];
}

export async function toggleFavorite() {
	throw new Error( __( 'Favorites require a paid plan.', 'perastra-blockvault' ) );
}

export async function getAccountInfo() { return { plan: 'free', block_limit: 10, site_limit: 1 }; }
export async function getCollections() { return []; }
export async function createCollection() { throw new Error( __( 'Collections require a paid plan.', 'perastra-blockvault' ) ); }
export async function deleteCollection() { throw new Error( __( 'Collections require a paid plan.', 'perastra-blockvault' ) ); }
export async function addBlockToCollection() { throw new Error( __( 'Collections require a paid plan.', 'perastra-blockvault' ) ); }
export async function removeBlockFromCollection() { throw new Error( __( 'Collections require a paid plan.', 'perastra-blockvault' ) ); }
export async function getRevisions() { return []; }
export async function restoreRevision() { throw new Error( __( 'Revision history requires the Agency plan.', 'perastra-blockvault' ) ); }

export async function deleteBlock( id ) {
	await delay( 150 );
	const blocks = getStoredBlocks();
	const filtered = blocks.filter( ( b ) => b.id !== id );
	setStoredBlocks( filtered );
	return { success: true };
}

export async function getCategories() {
	await delay( 50 );
	const blocks = getStoredBlocks();
	const cats = [
		...new Set( blocks.map( ( b ) => b.category ).filter( Boolean ) ),
	];
	return cats.sort();
}
