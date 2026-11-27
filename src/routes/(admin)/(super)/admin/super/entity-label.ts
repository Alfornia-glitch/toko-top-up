import { translateKey } from '#lib/frontend/i18n/dynamic.ts';

/** Translated name of an audit log `entityType` (`user`, `gift_card`, ...). Unknown types stay raw. */
export function entityLabel(type: string | null | undefined): string {
	if (!type) return '';
	return translateKey(`admin_super_entity_${type.toLowerCase()}`) ?? type;
}
