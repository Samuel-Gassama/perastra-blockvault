/**
 * Modal for saving selected blocks to the library.
 */

import { useState } from '@wordpress/element';
import {
	Modal,
	TextControl,
	CheckboxControl,
	Button,
	Flex,
	FlexItem,
	Notice,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { store as noticesStore } from '@wordpress/notices';
import { __ } from '@wordpress/i18n';
import { STORE_NAME } from '../store';
import { extractBlockCSS } from '../utils/extract-css';

export default function SaveModal( {
	defaultName,
	serialized,
	blockCount,
	clientIds,
	onClose,
} ) {
	const [ name, setName ] = useState( defaultName );
	const [ category, setCategory ] = useState( '' );
	const [ description, setDescription ] = useState( '' );
	const [ captureCSS, setCaptureCSS ] = useState( false );

	const { saveBlock } = useDispatch( STORE_NAME );
	const { createSuccessNotice, createErrorNotice } =
		useDispatch( noticesStore );

	const { isSaving, existingCategories, atLimit, blockLimit, blockUsed, plan } =
		useSelect( ( select ) => {
			const s = select( STORE_NAME );
			return {
				isSaving: s.isSaving(),
				existingCategories: s.getCategories(),
				atLimit: s.isAtLimit(),
				blockLimit: s.getBlockLimit(),
				blockUsed: s.getBlockCount(),
				plan: s.getPlan(),
			};
		}, [] );

	const isPro = [ 'pro', 'agency' ].includes( plan );
	const isPaid = plan !== 'free';

	const handleSave = async () => {
		if ( ! name.trim() || atLimit ) {
			return;
		}

		try {
			let css = '';

			// Pro+ plans: extract CSS from the frontend page (only if opted in).
			if ( isPro && captureCSS && serialized ) {
				css = await extractBlockCSS( clientIds, serialized );
			}

			const data = {
				name: name.trim(),
				markup: serialized,
				category: category.trim(),
			};

			if ( isPaid && description.trim() ) {
				data.description = description.trim();
			}

			if ( css ) {
				data.css = css;
			}

			await saveBlock( data );
			createSuccessNotice(
				`"${ name.trim() }" ${ __( 'saved to BlockVault', 'blockvault' ) } (${ blockCount } ${ blockCount !== 1 ? __( 'blocks', 'blockvault' ) : __( 'block', 'blockvault' ) })${ css ? ' ' + __( '+ styles captured', 'blockvault' ) : '' }`,
				{ type: 'snackbar' }
			);
			onClose();
		} catch ( error ) {
			createErrorNotice(
				error?.message ||
					__(
						'Failed to save block to BlockVault.',
						'blockvault'
					),
				{ type: 'snackbar' }
			);
		}
	};

	return (
		<Modal
			title={ __( 'Save to BlockVault', 'blockvault' ) }
			onRequestClose={ onClose }
			className="blockvault-save-modal"
		>
			{ atLimit && (
				<Notice status="warning" isDismissible={ false }>
					<strong>
						{ `${ __( 'Free plan limit reached', 'blockvault' ) } (${ blockUsed }/${ blockLimit })` }
					</strong>
					<br />
					{ __(
						'Connect a BlockVault account for unlimited blocks and cross-site sync.',
						'blockvault'
					) }
				</Notice>
			) }

			<TextControl
				label={ __( 'Name', 'blockvault' ) }
				value={ name }
				onChange={ setName }
				placeholder={ __(
					'My awesome section',
					'blockvault'
				) }
				autoFocus
				disabled={ atLimit }
			/>
			<TextControl
				label={ __( 'Category (optional)', 'blockvault' ) }
				value={ category }
				onChange={ setCategory }
				placeholder={ __(
					'e.g. Heroes, Footers, CTAs',
					'blockvault'
				) }
				help={
					existingCategories.length > 0
						? `${ __( 'Existing', 'blockvault' ) }: ${ existingCategories.join( ', ' ) }`
						: undefined
				}
				disabled={ atLimit }
			/>
			<TextControl
				label={ isPaid ? __( 'Notes (optional)', 'blockvault' ) : __( 'Notes (Solo+)', 'blockvault' ) }
				value={ description }
				onChange={ setDescription }
				placeholder={ isPaid ? __( 'Internal notes about this block', 'blockvault' ) : __( 'Upgrade to Solo to add notes', 'blockvault' ) }
				disabled={ atLimit || ! isPaid }
			/>

			{ isPro && ! atLimit && (
				<CheckboxControl
					label={ __( 'Capture CSS styles', 'blockvault' ) }
					help={ __( 'Extract theme CSS so the block looks identical on other sites.', 'blockvault' ) }
					checked={ captureCSS }
					onChange={ setCaptureCSS }
					__nextHasNoMarginBottom
				/>
			) }

			{ ! atLimit && (
				<p className="blockvault-save-modal__info">
					{ blockCount }{ ' ' }
					{ blockCount !== 1
						? __( 'blocks', 'blockvault' )
						: __( 'block', 'blockvault' ) }{ ' ' }
					{ __( 'will be saved.', 'blockvault' ) }
					{ isPro && captureCSS && (
						<span className="blockvault-save-modal__css-badge">
							{ ' ' }{ __( '+ CSS styles will be captured', 'blockvault' ) }
						</span>
					) }
					{ blockLimit !== Infinity && (
						<span className="blockvault-save-modal__usage">
							{ ' ' }({ blockUsed }/{ blockLimit }{ ' ' }
							{ __( 'used', 'blockvault' ) })
						</span>
					) }
				</p>
			) }

			<Flex justify="flex-end" style={ { marginTop: '16px' } }>
				<FlexItem>
					<Button variant="tertiary" onClick={ onClose }>
						{ atLimit
							? __( 'Close', 'blockvault' )
							: __( 'Cancel', 'blockvault' ) }
					</Button>
				</FlexItem>
				{ ! atLimit && (
					<FlexItem>
						<Button
							variant="primary"
							onClick={ handleSave }
							isBusy={ isSaving }
							disabled={ isSaving || ! name.trim() }
						>
							{ isSaving
								? __( 'Saving...', 'blockvault' )
								: __( 'Save to Library', 'blockvault' ) }
						</Button>
					</FlexItem>
				) }
			</Flex>
		</Modal>
	);
}
