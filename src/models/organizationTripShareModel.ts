import { TripShareModel, BaseTripShare } from './baseTripShareModel'

export interface OrganizationTripShare extends BaseTripShare {
  organization_id: number
}

class OrganizationTripShareModelClass extends TripShareModel<OrganizationTripShare, number> {
  protected tableName = 'organization_trip_shares'
  protected shareIdColumn = 'organization_id'
}

const instance = new OrganizationTripShareModelClass()

export async function create(
  tripId: number,
  organizationId: number,
  permissionLevel: 'read' | 'write'
): Promise<OrganizationTripShare> {
  return instance.create(tripId, organizationId, permissionLevel)
}

export async function findByTripAndOrganization(
  tripId: number,
  organizationId: number
): Promise<OrganizationTripShare | null> {
  return instance.findByTripAndShareId(tripId, organizationId)
}

export async function remove(tripId: number, organizationId: number): Promise<boolean> {
  return instance.remove(tripId, organizationId)
}

export async function getOrganizationPermission(
  tripId: number,
  organizationId: number
): Promise<string | null> {
  return instance.getPermission(tripId, organizationId)
}

const OrganizationTripShareModel = {
  create,
  findByTripAndOrganization,
  remove,
  getOrganizationPermission,
}

export default OrganizationTripShareModel
