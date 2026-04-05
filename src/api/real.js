/**
 * Real API client — talks to the BlockVault cloud API.
 */

/* global blockvaultSettings */

import { __ } from '@wordpress/i18n';

const REQUEST_TIMEOUT_MS = 15000;

function getHeaders() {
	return {
		'Content-Type': 'application/json',
		'X-API-Key': blockvaultSettings?.apiKey || '',
		'X-Site-URL': blockvaultSettings?.siteUrl || '',
	};
}

function getBaseUrl() {
	return ( blockvaultSettings?.apiUrl || 'https://blockvault-api-production.up.railway.app' ).replace(
		/\/$/,
		''
	);
}

/**
 * Fetch with timeout and structured error handling.
 */
async function apiFetch( url, options = {} ) {
	const controller = new AbortController();
	const timeoutId = setTimeout(
		() => controller.abort(),
		REQUEST_TIMEOUT_MS
	);

	try {
		const res = await fetch( url, {
			...options,
			headers: { ...getHeaders(), ...( options.headers || {} ) },
			signal: controller.signal,
		} );

		clearTimeout( timeoutId );

		if ( res.status === 401 ) {
			throw new Error(
				__(
					'Invalid API key. Check your key in Settings > BlockVault.',
					'blockvault'
				)
			);
		}

		if ( res.status === 403 ) {
			let detail = '';
			try {
				const body = await res.json();
				detail = body?.message || '';
			} catch {
				// Not JSON.
			}
			throw new Error(
				detail ||
					__(
						'Access denied. Your plan may not support this feature.',
						'blockvault'
					)
			);
		}

		if ( res.status === 429 ) {
			throw new Error(
				__(
					'Too many requests. Please wait a moment and try again.',
					'blockvault'
				)
			);
		}

		if ( ! res.ok ) {
			let detail = '';
			try {
				const body = await res.json();
				detail = body?.message || body?.error || '';
			} catch {
				// Response body not JSON.
			}
			throw new Error(
				detail ||
					`${ __( 'Server error', 'blockvault' ) }: ${ res.status }`
			);
		}

		return res.json();
	} catch ( error ) {
		clearTimeout( timeoutId );

		if ( error.name === 'AbortError' ) {
			throw new Error(
				__(
					'Request timed out. Check your internet connection.',
					'blockvault'
				)
			);
		}

		if ( error instanceof TypeError && error.message === 'Failed to fetch' ) {
			throw new Error(
				__(
					'Could not connect to BlockVault. Check your internet connection or try again later.',
					'blockvault'
				)
			);
		}

		throw error;
	}
}

export async function getBlockLimit() {
	// Cloud plans: the API returns the user's limit based on their plan.
	// For now, return Infinity (unlimited) — the server enforces the real limit.
	return Infinity;
}

export async function getBlocks() {
	return apiFetch( `${ getBaseUrl() }/blocks` );
}

export async function saveBlock( { name, markup, category = '' } ) {
	return apiFetch( `${ getBaseUrl() }/blocks`, {
		method: 'POST',
		body: JSON.stringify( { name, markup, category } ),
	} );
}

export async function updateBlock( id, data ) {
	const body = {};
	if ( data.name !== undefined ) body.name = data.name;
	if ( data.category !== undefined ) body.category = data.category;
	if ( data.description !== undefined ) body.description = data.description;
	if ( data.is_favorite !== undefined ) body.is_favorite = data.is_favorite;
	return apiFetch( `${ getBaseUrl() }/blocks/${ id }`, {
		method: 'PATCH',
		body: JSON.stringify( body ),
	} );
}

export async function toggleFavorite( id, currentValue ) {
	return updateBlock( id, { is_favorite: ! currentValue } );
}

// ── Collections ──────────────────────────────────────

export async function getCollections() {
	return apiFetch( `${ getBaseUrl() }/collections` );
}

export async function createCollection( name ) {
	return apiFetch( `${ getBaseUrl() }/collections`, {
		method: 'POST',
		body: JSON.stringify( { name } ),
	} );
}

export async function deleteCollection( id ) {
	return apiFetch( `${ getBaseUrl() }/collections/${ id }`, {
		method: 'DELETE',
	} );
}

export async function addBlockToCollection( collectionId, blockId ) {
	return apiFetch( `${ getBaseUrl() }/collections/${ collectionId }/blocks`, {
		method: 'POST',
		body: JSON.stringify( { block_id: blockId } ),
	} );
}

export async function removeBlockFromCollection( collectionId, blockId ) {
	return apiFetch( `${ getBaseUrl() }/collections/${ collectionId }/blocks/${ blockId }`, {
		method: 'DELETE',
	} );
}

// ── Revisions ────────────────────────────────────────

export async function getRevisions( blockId ) {
	return apiFetch( `${ getBaseUrl() }/revisions/${ blockId }` );
}

export async function restoreRevision( blockId, revisionId ) {
	return apiFetch( `${ getBaseUrl() }/revisions/${ blockId }/${ revisionId }/restore`, {
		method: 'POST',
	} );
}

export async function deleteBlock( id ) {
	return apiFetch( `${ getBaseUrl() }/blocks/${ id }`, {
		method: 'DELETE',
	} );
}

export async function getCategories() {
	const blocks = await getBlocks();
	const cats = [
		...new Set( blocks.map( ( b ) => b.category ).filter( Boolean ) ),
	];
	return cats.sort();
}
