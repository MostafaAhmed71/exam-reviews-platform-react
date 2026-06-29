import type { UploadedMaterial } from '@/types/database.types';
import { Button } from '@/components/Button';
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './MaterialsSortBucket.css';

type Props = {
    title: string;
    hint?: string;
    items: UploadedMaterial[];
    bucketId: string;
    /** يُحدَّث ترتيب العرض كنِسَب موزعة (1 من أول قائمة هذا الصف بعد السحب) */
    onPersistReorder: (
        bucketId: string,
        nextOrdered: UploadedMaterial[],
    ) => Promise<void>;
    /** عرض عدد مشاهدات الفيديو */
    videoViewCounts: Map<number, number>;
    onView: (m: UploadedMaterial) => void;
    onEdit: (m: UploadedMaterial) => void;
    onDelete: (id: number) => void;
    formatFileSize: (bytes: number) => string;
    formatDate: (iso: string) => string;
    getGradeLabel: (grade: number) => string;
};

type RowProps = {
    material: UploadedMaterial;
    onView: (m: UploadedMaterial) => void;
    onEdit: (m: UploadedMaterial) => void;
    onDelete: (id: number) => void;
    videoViewCounts: Map<number, number>;
    formatFileSize: (b: number) => string;
    formatDate: (s: string) => string;
    getGradeLabel: (g: number) => string;
};

function orderBadgeText(v: unknown): string {
    if (v === null || v === undefined) return 'تلقائي';
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n) || n <= 0) return 'تلقائي';
    return String(Math.floor(n));
}

function SortableRow(props: RowProps) {
    const { material } = props;
    const id = material.id != null ? String(material.id) : null;
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: id ?? 'noop', disabled: !id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 2 : undefined,
        opacity: isDragging ? 0.92 : 1,
    };

    if (!id) return null;

    return (
        <div ref={setNodeRef} style={style} className="msb-row sortable-material-item">
            <button
                type="button"
                className="msb-drag"
                {...attributes}
                {...listeners}
                aria-label="اسحب لإعادة ترتيب المادة"
                title="سحب"
            >
                ⠿
            </button>
            <div className="msb-body">
                <div className="msb-meta-top">
                    <span className="msb-badge-order">
                        ترقيم العرض: {orderBadgeText(material.display_order)}
                    </span>
                    <h3 className="msb-subject">{material.subject_name}</h3>
                </div>
                <p className="msb-line-muted">
                    {material.stage === 'middle' ? 'متوسط' : 'ثانوي'} •{' '}
                    {props.getGradeLabel(material.grade)} • نوع المحتوى:{' '}
                    {material.content_type}
                </p>
                <p className="msb-line-muted">{material.file_name}</p>
                <p className="msb-line-muted">{props.formatFileSize(material.file_size)}</p>
                {material.content_type === 'videos' &&
                    material.id &&
                    props.videoViewCounts.has(material.id) && (
                        <p className="msb-views">
                            👁️ {props.videoViewCounts.get(material.id)}
                        </p>
                    )}
                {material.uploaded_at && (
                    <p className="msb-date">{props.formatDate(material.uploaded_at)}</p>
                )}
                <div className="msb-actions">
                    <Button variant="primary" type="button" className="msb-btn" onClick={() => props.onView(material)}>
                        عرض
                    </Button>
                    <Button variant="secondary" type="button" className="msb-btn" onClick={() => props.onEdit(material)}>
                        تعديل
                    </Button>
                    <Button variant="secondary" type="button" className="msb-btn" onClick={() => material.id && props.onDelete(material.id)}>
                        حذف
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function MaterialsSortBucket({
    title,
    hint,
    items,
    bucketId,
    onPersistReorder,
    ...handlers
}: Props) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 12 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const itemIds = items.map((m) => String(m.id!)).filter(Boolean);

    const onDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = items.findIndex((m) => String(m.id) === active.id);
        const newIndex = items.findIndex((m) => String(m.id) === over.id);
        if (oldIndex < 0 || newIndex < 0) return;
        const next = arrayMove(items, oldIndex, newIndex);
        await onPersistReorder(bucketId, next);
    };

    if (items.length === 0) return null;

    return (
        <section className="msb-section" aria-labelledby={`bucket-${bucketId}`}>
            <div className="msb-head">
                <h2 id={`bucket-${bucketId}`} className="msb-title">
                    {title}
                </h2>
                {hint && <p className="msb-hint">{hint}</p>}
            </div>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => {
                    void onDragEnd(e);
                }}
            >
                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                    <div className="msb-list">
                        {items.map((m) => (
                            <SortableRow key={m.id} material={m} {...handlers} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </section>
    );
}
