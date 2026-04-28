/**
 * PerAstra BlockVault — admin settings page interactions.
 *
 * Reads dynamic data (nonces, translated strings, ajaxurl) from the
 * `perAstraBlockVaultAdmin` global, populated by wp_localize_script() in
 * PerAstra_BlockVault_Admin::enqueue_admin_assets().
 */
( function () {
	'use strict';

	if ( typeof window.perAstraBlockVaultAdmin === 'undefined' ) {
		return;
	}

	var data = window.perAstraBlockVaultAdmin;
	var ajaxurl = data.ajaxurl;
	var i18n = data.i18n || {};
	var nonces = data.nonces || {};

	function ready( fn ) {
		if ( document.readyState !== 'loading' ) {
			fn();
		} else {
			document.addEventListener( 'DOMContentLoaded', fn );
		}
	}

	ready( function () {
		// ── Toggle API key visibility ───────────────────────────────────
		// Swap the <input>'s type between password and text. The browser
		// handles real masking when type === password.
		var toggleBtn = document.querySelector( '.blockvault-admin__toggle-key' );
		var keyInput = document.getElementById( 'perastra_blockvault_api_key' );
		if ( toggleBtn && keyInput ) {
			toggleBtn.addEventListener( 'click', function () {
				var icon = toggleBtn.querySelector( '.dashicons' );
				if ( keyInput.type === 'password' ) {
					keyInput.type = 'text';
					icon.className = 'dashicons dashicons-hidden';
				} else {
					keyInput.type = 'password';
					icon.className = 'dashicons dashicons-visibility';
				}
			} );
		}

		// ── Copy API key ────────────────────────────────────────────────
		var copyBtn = document.querySelector( '.blockvault-admin__copy-key' );
		if ( copyBtn ) {
			copyBtn.addEventListener( 'click', function () {
				var input = document.getElementById( 'perastra_blockvault_api_key' );
				if ( ! input || ! navigator.clipboard ) return;
				navigator.clipboard.writeText( input.value ).then( function () {
					var icon = copyBtn.querySelector( '.dashicons' );
					icon.className = 'dashicons dashicons-yes';
					setTimeout( function () {
						icon.className = 'dashicons dashicons-clipboard';
					}, 1500 );
				} );
			} );
		}

		// ── Disconnect ──────────────────────────────────────────────────
		var disconnectBtn = document.querySelector( '.blockvault-admin__disconnect' );
		if ( disconnectBtn ) {
			disconnectBtn.addEventListener( 'click', function () {
				// eslint-disable-next-line no-alert
				if ( ! window.confirm( i18n.disconnectConfirm ) ) return;
				fetch( ajaxurl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body:
						'action=perastra_blockvault_disconnect' +
						'&_wpnonce=' + encodeURIComponent( nonces.disconnect ),
				} )
					.then( function ( r ) { return r.json(); } )
					.then( function () { window.location.reload(); } );
			} );
		}

		// ── Auth tabs (Register / Login) ────────────────────────────────
		document.querySelectorAll( '.blockvault-admin__auth-tab' ).forEach( function ( tab ) {
			tab.addEventListener( 'click', function () {
				document.querySelectorAll( '.blockvault-admin__auth-tab' ).forEach( function ( t ) {
					t.classList.remove( 'active' );
				} );
				document.querySelectorAll( '.blockvault-admin__auth-panel' ).forEach( function ( p ) {
					p.classList.remove( 'active' );
				} );
				tab.classList.add( 'active' );
				var panel = document.querySelector( '[data-panel="' + tab.dataset.tab + '"]' );
				if ( panel ) panel.classList.add( 'active' );
			} );
		} );

		// ── Login ───────────────────────────────────────────────────────
		var loginBtn = document.querySelector( '.blockvault-admin__login-btn' );
		if ( loginBtn ) {
			loginBtn.addEventListener( 'click', function () {
				var emailField = document.getElementById( 'bv-login-email' );
				var passField = document.getElementById( 'bv-login-password' );
				var result = document.querySelector( '.blockvault-admin__login-result' );
				var email = emailField ? emailField.value.trim() : '';
				var pass = passField ? passField.value : '';

				if ( ! email || ! pass ) {
					showResult( result, 'blockvault-admin__login-result', 'error', i18n.requiredFields );
					return;
				}

				loginBtn.disabled = true;
				loginBtn.textContent = i18n.loggingIn;

				fetch( ajaxurl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body:
						'action=perastra_blockvault_login' +
						'&email=' + encodeURIComponent( email ) +
						'&password=' + encodeURIComponent( pass ) +
						'&_wpnonce=' + encodeURIComponent( nonces.login ),
				} )
					.then( function ( r ) { return r.json(); } )
					.then( function ( data ) {
						if ( data.success ) {
							showResult( result, 'blockvault-admin__login-result', 'success', i18n.loginSuccess );
							setTimeout( function () { window.location.reload(); }, 1500 );
						} else {
							showResult( result, 'blockvault-admin__login-result', 'error', data.data || i18n.loginInvalid );
							loginBtn.disabled = false;
							loginBtn.textContent = i18n.loginButton;
						}
					} )
					.catch( function () {
						showResult( result, 'blockvault-admin__login-result', 'error', i18n.connectionError );
						loginBtn.disabled = false;
						loginBtn.textContent = i18n.loginButton;
					} );
			} );
		}

		// ── Register ────────────────────────────────────────────────────
		var registerBtn = document.querySelector( '.blockvault-admin__register-btn' );
		if ( registerBtn ) {
			registerBtn.addEventListener( 'click', function () {
				var emailField = document.getElementById( 'bv-register-email' );
				var passField = document.getElementById( 'bv-register-password' );
				var result = document.querySelector( '.blockvault-admin__register-result' );
				var email = emailField ? emailField.value.trim() : '';
				var pass = passField ? passField.value : '';

				if ( ! email || ! pass ) {
					showResult( result, 'blockvault-admin__register-result', 'error', i18n.requiredFields );
					return;
				}
				if ( pass.length < 8 ) {
					showResult( result, 'blockvault-admin__register-result', 'error', i18n.passwordTooShort );
					return;
				}

				registerBtn.disabled = true;
				registerBtn.textContent = i18n.creatingAccount;

				fetch( ajaxurl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body:
						'action=perastra_blockvault_register' +
						'&email=' + encodeURIComponent( email ) +
						'&password=' + encodeURIComponent( pass ) +
						'&_wpnonce=' + encodeURIComponent( nonces.register ),
				} )
					.then( function ( r ) { return r.json(); } )
					.then( function ( data ) {
						if ( data.success ) {
							showResult( result, 'blockvault-admin__register-result', 'success', i18n.registerSuccess );
							setTimeout( function () { window.location.reload(); }, 1500 );
						} else {
							showResult( result, 'blockvault-admin__register-result', 'error', data.data || i18n.registerFailed );
							registerBtn.disabled = false;
							registerBtn.textContent = i18n.registerButton;
						}
					} )
					.catch( function () {
						showResult( result, 'blockvault-admin__register-result', 'error', i18n.connectionError );
						registerBtn.disabled = false;
						registerBtn.textContent = i18n.registerButton;
					} );
			} );
		}
	} );

	function showResult( el, baseClass, type, message ) {
		if ( ! el ) return;
		el.style.display = 'block';
		el.className = baseClass + ' notice notice-' + ( type === 'success' ? 'success' : 'error' );
		el.textContent = message;
	}
} )();
