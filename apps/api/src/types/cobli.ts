// Tipos TypeScript para respostas da API Cobli
// Ref: GET https://api.cobli.co/checklists/completed-checklists

export type CobliFieldType = 'CHECK' | 'CHECKED' | 'TEXT' | 'MULTI_SELECT' | 'SINGLE_SELECT'

export interface CobliSelectOption {
  label: string
  checked: boolean
}

export interface CobliFieldContent {
  checked?: boolean
  value?: string
  options?: CobliSelectOption[]
}

export interface CobliChecklistField {
  id?: string
  title: string
  type: CobliFieldType
  required?: boolean
  should_request_photos?: boolean
  photos_urls?: string[]
  content?: CobliFieldContent
}

export interface CobliVehicle {
  device_id?: string | number
  license_plate?: string
  brand?: string
  model?: string
  group_id?: string
}

export interface CobliChecklistContext {
  app_version?: string | number
  vehicle?: CobliVehicle
  address?: string
  completed_at?: number
}

export interface CobliCompletedChecklist {
  id: string
  version?: number
  name: string
  template?: boolean
  template_id?: string
  created_at?: number
  created_by?: string
  template_created_at?: number
  template_created_by?: string
  context?: CobliChecklistContext
  fields?: CobliChecklistField[]
}

export interface CobliPageable {
  page_number?: number
  page_size?: number
  offset?: number
  paged?: boolean
  unpaged?: boolean
}

export interface CobliPage {
  content: CobliCompletedChecklist[]
  pageable?: CobliPageable
  total_pages?: number
  total_elements?: number
  last?: boolean
  number_of_elements?: number
  first?: boolean
  size?: number
  number?: number
  empty?: boolean
}

export interface CobliCompletedChecklistsResponse {
  page: CobliPage
}

export interface CobliSyncParams {
  startMillis?: number
  endMillis?: number
  nameFilter?: string
  createdByFilter?: string
}
