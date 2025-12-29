import { TripShareModel, BaseTripShare } from './baseTripShareModel'

export interface UserTripShare extends BaseTripShare {
  user_id: number
}

class UserTripShareModelClass extends TripShareModel<UserTripShare, number> {
  protected tableName = 'user_trip_shares'
  protected shareIdColumn = 'user_id'
}

const instance = new UserTripShareModelClass()

export const UserTripShareModel = {
  create: (tripId: number, userId: number, permissionLevel: 'read' | 'write') => 
    instance.create(tripId, userId, permissionLevel),
  findByTripAndUser: (tripId: number, userId: number) => 
    instance.findByTripAndShareId(tripId, userId),
  remove: (tripId: number, userId: number) => 
    instance.remove(tripId, userId),
  getUserPermission: (tripId: number, userId: number) => 
    instance.getPermission(tripId, userId),
}
