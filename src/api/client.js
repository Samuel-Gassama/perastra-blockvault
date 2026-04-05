/**
 * API client router.
 * Uses mock (localStorage) when no API key is set,
 * real cloud API when configured.
 */

/* global blockvaultSettings */

import * as mock from './mock';
import * as real from './real';

const STORAGE_KEY = 'blockvault_blocks';
const MIGRATED_KEY = 'blockvault_migrated';

function isCloudMode() {
	return !! ( blockvaultSettings?.apiKey );
}

export function getClient() {
	return isCloudMode() ? real : mock;
}

/**
 * Migrate local blocks to the cloud when switching from local → cloud mode.
 * Runs once per site — sets a flag in localStorage after migration.
 */
export async function migrateLocalToCloud() {
	if ( ! isCloudMode() ) return 0;
	if ( localStorage.getItem( MIGRATED_KEY ) ) return 0;

	let localBlocks;
	try {
		const raw = localStorage.getItem( STORAGE_KEY );
		if ( ! raw ) {
			localStorage.setItem( MIGRATED_KEY, '1' );
			return 0;
		}
		localBlocks = JSON.parse( raw );
		if ( ! Array.isArray( localBlocks ) || localBlocks.length === 0 ) {
			localStorage.setItem( MIGRATED_KEY, '1' );
			return 0;
		}
	} catch {
		localStorage.setItem( MIGRATED_KEY, '1' );
		return 0;
	}

	// Upload each local block to the cloud.
	let migrated = 0;
	for ( const block of localBlocks ) {
		try {
			await real.saveBlock( {
				name: block.name,
				markup: block.markup,
				category: block.category || '',
			} );
			migrated++;
		} catch ( e ) {
			// eslint-disable-next-line no-console
			console.warn( 'BlockVault: Failed to migrate block:', block.name, e );
		}
	}

	// Clear local storage and mark as migrated.
	localStorage.removeItem( STORAGE_KEY );
	localStorage.setItem( MIGRATED_KEY, '1' );

	// eslint-disable-next-line no-console
	console.log( `BlockVault: Migrated ${ migrated } local blocks to cloud.` );
	return migrated;
}

export function getBlocks() {
	return getClient().getBlocks();
}

export function saveBlock( data ) {
	return getClient().saveBlock( data );
}

export function deleteBlock( id ) {
	return getClient().deleteBlock( id );
}

export function getCategories() {
	return getClient().getCategories();
}

export function getBlockLimit() {
	return getClient().getBlockLimit();
}

export function isUsingCloud() {
	return isCloudMode();
}
