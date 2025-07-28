package session

import "k8s.io/utils/set"

// permission.go defines the permission structure. These functions are to be
// used in combination with (r *Room) broadcast (r *Room) broadcastRoomState
// to describe which roles have permission to view the message.

// HasParticipantPermission returns a set of RoleType values that are granted
// waiting-level permissions.
func HasWaitingPermission() set.Set[RoleType] {
	return set.New(RoleTypeWaiting)
}

// HasParticipantPermission returns a set of RoleType values that are granted
// participant-level permissions.
func HasParticipantPermission() set.Set[RoleType] {
	return set.New(RoleTypeHost, RoleTypeScreenshare, RoleTypeParticipant)
}

// HasScreensharePermission returns a set of RoleType values that are granted
// screenshare-level permissions.
func HasScreensharePermission() set.Set[RoleType] {
	return set.New(RoleTypeHost, RoleTypeScreenshare)
}

// HasHostPermission returns a set of RoleType values that are granted
// host-level permissions.
func HasHostPermission() set.Set[RoleType] {
	return set.New(RoleTypeHost)
}

// HasPermission checks if the given client has any of the specified permissions
// for any given level. 
func HasPermission(role RoleType, permissions set.Set[RoleType]) bool {
	return permissions.Has(role)
}
