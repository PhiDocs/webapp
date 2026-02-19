export const ACL_PERMISSIONS = ['company.create'] as const;

export type AclPermission = (typeof ACL_PERMISSIONS)[number];

export type ScopedPermission = {
  companyId: string;
  permissions: AclPermission[];
};
