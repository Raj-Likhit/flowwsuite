import React from 'react';
import { useStore } from '../../store/useStore';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy
} from '@dnd-kit/sortable';
import { SortableItem } from '../ui/SortableItem';
import { ImageCard } from '../ui/ImageCard';

export const ImageGrid: React.FC = () => {
    const { pages, removePage, settings, reorderPages } = useStore();
    const { borderWidth, baseColor, showPageNumbers, activeFilter } = settings;

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            // Delay to distinguish between scroll and drag
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = pages.findIndex((p) => p.id === active.id);
            const newIndex = pages.findIndex((p) => p.id === over.id);
            reorderPages(arrayMove(pages, oldIndex, newIndex));
        }
    };

    const filterStyle = {
        none: '',
        grayscale: 'grayscale(1)',
        sepia: 'sepia(1)',
        vibrant: 'saturate(1.8) contrast(1.1)',
    }[activeFilter];

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={pages.map(p => p.id)}
                strategy={rectSortingStrategy}
            >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 py-6 pb-24 justify-items-center">
                    {pages.map((page, index) => (
                        <SortableItem key={page.id} id={page.id}>
                            <ImageCard
                                id={page.id}
                                previewUrl={page.previewUrl}
                                rotation={page.rotation}
                                filterStyle={filterStyle}
                                borderStyle={{ border: `${borderWidth / 2}px solid ${baseColor}` }}
                                showPageNumbers={showPageNumbers}
                                pageIndex={index}
                                onRemove={removePage}
                            />
                        </SortableItem>
                    ))}

                    <style>{`
            .a4-preview-card {
                aspect-ratio: 210/297;
                width: 100%;
                max-width: 160px;
            }
            @media (min-width: 768px) {
                .a4-preview-card { max-width: 180px; }
            }
          `}</style>
                </div>
            </SortableContext>
        </DndContext>
    );
};
