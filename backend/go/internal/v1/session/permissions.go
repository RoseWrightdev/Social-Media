package session

import "k8s.io/utils/set"

// permission.go defines the permission structure. These functions are to be
// used in combination with (r *Room) broadcast (r *Room) broadcastRoomState
// to describe which roles have permission to view the message.

// HasWaitingPermission returns a set containing the RoleTypeWaiting role.
// This can be used to check if a user has the "waiting" permission.
func HasWaitingPermission() set.Set[RoleType] {
	return set.New(RoleTypeWaiting)
}

// HasParticipantPermission returns a set of RoleType values that are granted
// participant-level permissions. The set includes roles such as Host, 
// Screenshare, and Participant.
func HasParticipantPermission() set.Set[RoleType] {
	return set.New(RoleTypeHost, RoleTypeScreenshare, RoleTypeParticipant)
}

// HasScreensharePermission returns a set of RoleType values that are 
// permitted to use the screenshare feature. The set typically includes roles
// such as Host and Screenshare, granting them the necessary permissions.
func HasScreensharePermission() set.Set[RoleType] {
	return set.New(RoleTypeHost, RoleTypeScreenshare)
}

// HasHostPermission returns a set containing the RoleTypeHost role,
// representing the permissions required for a host user.
// This can be used to check if a user has host-level permissions.
func HasHostPermission() set.Set[RoleType] {
	return set.New(RoleTypeHost)
}
