/**
 * BlockVault — Gutenberg editor plugin entry point.
 *
 * Registers the sidebar panel and toolbar menu item.
 */

import { registerPlugin } from '@wordpress/plugins';
import {
	PluginSidebar,
	PluginSidebarMoreMenuItem,
	PluginBlockSettingsMenuItem,
} from '@wordpress/editor';
import { useState, useCallback, useEffect } from '@wordpress/element';
import { useDispatch } from '@wordpress/data';
import { store as noticesStore } from '@wordpress/notices';
import { Icon } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

import './store';
import './style.scss';
import Sidebar from './components/Sidebar';
import SaveModal from './components/SaveModal';
import { useSelectedBlocks } from './hooks/useSelectedBlocks';

const VAULT_ICON_SVG = (
	<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 1.5a.5.5 0 0 0-.5.5v12a.5.5 0 0 0 .5.5h16a.5.5 0 0 0 .5-.5V6a.5.5 0 0 0-.5-.5H4zm8 2.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 1.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm0 1.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
	</svg>
);

const VaultIcon = () => <Icon icon={ VAULT_ICON_SVG } />;

function BlockVaultPlugin() {
	const [ showSaveModal, setShowSaveModal ] = useState( false );
	const { hasSelection, serialized, defaultName, blocks, clientIds } =
		useSelectedBlocks();
	const { createWarningNotice } = useDispatch( noticesStore );

	const handleRequestSave = useCallback( () => {
		if ( ! hasSelection ) {
			createWarningNotice(
				__( 'Select one or more blocks first.', 'blockvault' ),
				{ type: 'snackbar' }
			);
			return;
		}
		setShowSaveModal( true );
	}, [ hasSelection, createWarningNotice ] );

	// Global keyboard shortcut: Ctrl+Shift+S / Cmd+Shift+S.
	useEffect( () => {
		const handler = ( e ) => {
			if ( ( e.ctrlKey || e.metaKey ) && e.shiftKey && ( e.key === 'S' || e.key === 's' ) ) {
				e.preventDefault();
				e.stopPropagation();
				handleRequestSave();
			}
		};
		document.addEventListener( 'keydown', handler, true );
		return () => document.removeEventListener( 'keydown', handler, true );
	}, [ handleRequestSave ] );

	return (
		<>
			<PluginSidebarMoreMenuItem
				target="blockvault-sidebar"
				icon={ <VaultIcon /> }
			>
				{ __( 'BlockVault Library', 'blockvault' ) }
			</PluginSidebarMoreMenuItem>

			<PluginSidebar
				name="blockvault-sidebar"
				title={ __( 'BlockVault', 'blockvault' ) }
				icon={ <VaultIcon /> }
			>
				<Sidebar onRequestSave={ handleRequestSave } />
			</PluginSidebar>

			<PluginBlockSettingsMenuItem
				icon={ <VaultIcon /> }
				label={ __( 'Save to BlockVault', 'blockvault' ) }
				onClick={ handleRequestSave }
			/>

			{ showSaveModal && hasSelection && (
				<SaveModal
					defaultName={ defaultName }
					serialized={ serialized }
					blockCount={ blocks.length }
					clientIds={ clientIds }
					onClose={ () => setShowSaveModal( false ) }
				/>
			) }
		</>
	);
}

registerPlugin( 'blockvault', {
	render: BlockVaultPlugin,
} );
