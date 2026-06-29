import type { UploadedMaterial } from '@/types/database.types';

/** قيمة 0 أو غير محدد = يظهر بعد المواد ذات الترتيب الصريح */
const UNSET_ORDER = 1_000_000;

function rowOrder(m: UploadedMaterial): number {
    const o = m.display_order;
    if (o === null || o === undefined || o <= 0) return UNSET_ORDER;
    return o;
}

/** ترتيب صفوف مادة واحدة (عدة ملفات لنفس المادة) */
export function sortUploadedMaterials(materials: UploadedMaterial[]): UploadedMaterial[] {
    return [...materials].sort((a, b) => {
        const av = rowOrder(a);
        const bv = rowOrder(b);
        if (av !== bv) return av - bv;
        const at = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0;
        const bt = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0;
        return bt - at;
    });
}

export interface GroupedMaterialsLike {
    subject_name: string;
    materials: UploadedMaterial[];
    teacher_whatsapp?: string;
}

/** ترتيب المواد داخل كل مادة + ترتيب مجموعات المواد حسب أصغر display_order في المجموعة */
export function orderGroupedMaterials(groups: GroupedMaterialsLike[]): GroupedMaterialsLike[] {
    return [...groups]
        .map((g) => ({
            ...g,
            materials: sortUploadedMaterials(g.materials),
        }))
        .sort((a, b) => {
            const minA =
                a.materials.length === 0
                    ? UNSET_ORDER
                    : Math.min(...a.materials.map(rowOrder));
            const minB =
                b.materials.length === 0
                    ? UNSET_ORDER
                    : Math.min(...b.materials.map(rowOrder));
            if (minA !== minB) return minA - minB;
            return a.subject_name.localeCompare(b.subject_name, 'ar');
        });
}

export interface GroupedVideosLike {
    subject_name: string;
    videos: UploadedMaterial[];
    teacher_whatsapp?: string;
}

export function orderGroupedVideos(groups: GroupedVideosLike[]): GroupedVideosLike[] {
    return [...groups]
        .map((g) => ({
            ...g,
            videos: sortUploadedMaterials(g.videos),
        }))
        .sort((a, b) => {
            const minA =
                a.videos.length === 0 ? UNSET_ORDER : Math.min(...a.videos.map(rowOrder));
            const minB =
                b.videos.length === 0 ? UNSET_ORDER : Math.min(...b.videos.map(rowOrder));
            if (minA !== minB) return minA - minB;
            return a.subject_name.localeCompare(b.subject_name, 'ar');
        });
}
