import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { Todo } from '../types/todo'
import { TodoItem, TodoItemOverlay } from './TodoItem'

interface TodoListProps {
  todos: Todo[]
  currentDate: string
  onToggle: (index: number) => void
  onPin: (index: number) => void
  onDelete: (index: number) => void
  onUpdate: (index: number, text: string) => void
  onReorder: (oldIndex: number, newIndex: number) => void
}

// 고정된 항목을 상단에 정렬하는 헬퍼
const sortByPinned = (items: Todo[]): Todo[] => {
  return [...items].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return 0
  })
}

export function TodoList({ todos, currentDate, onToggle, onPin, onDelete, onUpdate, onReorder }: TodoListProps) {
  const [activeId, setActiveId] = useState<number | null>(null)

  // 섹션 분리: 오늘 추가 / 이전에서 넘어온 할 일 / 완료 (각각 고정된 항목 상단 정렬)
  const todayIncomplete = sortByPinned(todos.filter(t => !t.completed && t.originalDate === currentDate))
  const carryoverIncomplete = sortByPinned(todos.filter(t => !t.completed && t.originalDate && t.originalDate !== currentDate))
  const completed = sortByPinned(todos.filter(t => t.completed))

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(Number(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      const oldIndex = Number(active.id)
      const newIndex = Number(over.id)
      onReorder(oldIndex, newIndex)
    }
  }

  const handleDragCancel = () => {
    setActiveId(null)
  }

  if (todos.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 dark:text-slate-500">
        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p>TODO가 없습니다</p>
      </div>
    )
  }

  // Calculate original indices
  const getOriginalIndex = (todo: Todo) => todos.indexOf(todo)

  // Create sortable IDs based on original indices
  const carryoverIds = carryoverIncomplete.map(todo => getOriginalIndex(todo))
  const todayIds = todayIncomplete.map(todo => getOriginalIndex(todo))
  const completedIds = completed.map(todo => getOriginalIndex(todo))

  // Get active todo for overlay
  const activeTodo = activeId !== null ? todos[activeId] : null

  const totalIncomplete = carryoverIncomplete.length + todayIncomplete.length

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-6">
        {/* 이전에서 넘어온 할 일 */}
        {carryoverIncomplete.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-wider mb-3">
              이전에서 넘어온 할 일 ({carryoverIncomplete.length})
            </h2>
            <SortableContext items={carryoverIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {carryoverIncomplete.map((todo) => {
                  const idx = getOriginalIndex(todo)
                  return (
                    <TodoItem
                      key={idx}
                      id={idx}
                      todo={todo}
                      index={idx}
                      isCarryover={true}
                      onToggle={onToggle}
                      onPin={onPin}
                      onDelete={onDelete}
                      onUpdate={onUpdate}
                    />
                  )
                })}
              </div>
            </SortableContext>
          </section>
        )}

        {/* 오늘 추가된 할 일 */}
        {todayIncomplete.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              오늘 추가 ({todayIncomplete.length})
            </h2>
            <SortableContext items={todayIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {todayIncomplete.map((todo) => {
                  const idx = getOriginalIndex(todo)
                  return (
                    <TodoItem
                      key={idx}
                      id={idx}
                      todo={todo}
                      index={idx}
                      isCarryover={false}
                      onToggle={onToggle}
                      onPin={onPin}
                      onDelete={onDelete}
                      onUpdate={onUpdate}
                    />
                  )
                })}
              </div>
            </SortableContext>
          </section>
        )}

        {/* 완료된 할 일 */}
        {completed.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              완료 ({completed.length})
            </h2>
            <SortableContext items={completedIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {completed.map((todo) => {
                  const idx = getOriginalIndex(todo)
                  return (
                    <TodoItem
                      key={idx}
                      id={idx}
                      todo={todo}
                      index={idx}
                      isCarryover={false}
                      onToggle={onToggle}
                      onPin={onPin}
                      onDelete={onDelete}
                      onUpdate={onUpdate}
                    />
                  )
                })}
              </div>
            </SortableContext>
          </section>
        )}

        <div className="text-center text-xs text-slate-400 dark:text-slate-500 pt-4">
          총 {todos.length}개 (미완료: {totalIncomplete}, 완료: {completed.length})
        </div>
      </div>

      <DragOverlay>
        {activeTodo ? <TodoItemOverlay todo={activeTodo} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
