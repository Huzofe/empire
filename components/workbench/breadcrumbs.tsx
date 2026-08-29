'use client'

import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  id: string
  title: string
  icon?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  onItemClick: (id: string) => void
}

export function Breadcrumbs({ items, onItemClick }: BreadcrumbsProps) {
  if (items.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white border-b overflow-x-auto">
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2">
          <button
            onClick={() => onItemClick(item.id)}
            className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded text-sm whitespace-nowrap"
          >
            {item.icon && <span>{item.icon}</span>}
            <span className={index === items.length - 1 ? 'font-medium' : ''}>
              {item.title}
            </span>
          </button>
          
          {index < items.length - 1 && (
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  )
}
