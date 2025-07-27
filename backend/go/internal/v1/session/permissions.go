package session

// todo: add docs
// todo: add file level comment

func HasWaitingPermission() []RoleType {
	return []RoleType{RoleTypeWaiting}
}

func HasParticipantPermission() []RoleType {
	return []RoleType{RoleTypeHost, RoleTypeScreenshare, RoleTypeParticipant}
}

func HasScreensharePermission() []RoleType {
	return []RoleType{RoleTypeHost, RoleTypeScreenshare}
}

func HasHostPermission() []RoleType {
	return []RoleType{RoleTypeHost}
}
