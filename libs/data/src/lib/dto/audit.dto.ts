export interface AuditLogQueryDto {
  page?: number;
  limit?: number;
  entityType?: string;
  action?: string;
}
