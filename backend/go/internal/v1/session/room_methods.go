package session

// addParticipant adds the given client to the room's participants list and sets their role to participant.
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) addParticipant_unlocked(client *Client) {
	client.Role = RoleTypeParticipant
	// push to q
	element := r.clientDrawOrderQueue.PushBack(client)
	client.drawOrderElement = element
	// add to particpants
	r.participants[client.UserID] = client
}

// todo: unimpl
func (r *Room) removeParticipant_unlocked(client *Client) {
	panic("todo: unimpl")
}

// todo: unimpl
func (r *Room) isParticipant_unlocked(role RoleType) {
	panic("todo: unimpl")
}

// addHost_unlocked adds the given client as a host to the room.
// It sets the client's role to host, adds the client to the draw order queue, and updates the hosts map.
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) addHost_unlocked(client *Client) {
	client.Role = RoleTypeHost
	// push to q
	element := r.clientDrawOrderQueue.PushBack(client)
	client.drawOrderElement = element
	// add to particpants if not already
	r.hosts[client.UserID] = client
}

// removeHost_unlocked removes the given client from the room's hosts map and draw order queue.
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) removeHost_unlocked(client *Client) {
	delete(r.hosts, client.UserID)
	if client.drawOrderElement != nil {
		r.clientDrawOrderQueue.Remove(client.drawOrderElement)
		client.drawOrderElement = nil
	}
}

// todo: unimpl
func (r *Room) isHost(client *Client) bool {
	panic("todo: unimpl")
}

// todo: unimpl
func (r *Room) addWaiting_unlocked(client *Client) {
	panic("todo: unimpl")
}

// todo: unimpl
func (r *Room) removeWaiting_unlocked(client *Client) {
	panic("todo: unimpl")
}

// todo: unimpl
func (r *Room) isWaiting_unlocked(client *Client) {
	panic("todo: unimpl")
}

// addScreenshare_unlocked adds a client as a screensharer to the room.
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) addScreenshare_unlocked(client *Client) {
	client.Role = RoleTypeScreenshare
	element := r.clientDrawOrderQueue.PushBack(client)
	client.drawOrderElement = element
	r.sharingScreen[client.UserID] = client
}

// removeScreenshare_unlocked removes a client from the screensharers in the room.
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) removeScreenshare_unlocked(client *Client) {
	delete(r.sharingScreen, client.UserID)
	if client.drawOrderElement != nil {
		r.clientDrawOrderQueue.Remove(client.drawOrderElement)
		client.drawOrderElement = nil
	}
}

// todo: unimpl
// addChatMessage_unlocked adds a chat message to the room's chat history.
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) addChatMessage_unlocked(p ChatMessagePayload) {
	panic("todo: unimpl")
}

// todo: unimpl
// removeChatMessage_unlocked removes a chat message from the room's chat history by ID.
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) deleteChatMessage_unlocked(msgID string) {
	panic("todo: unimpl")
}

// todo: unimpl
func (r *Room) getRecentChatMessages(startIndex int, maxCount int) {
	panic("todo: unimpl")
}

// WS Methods
// todo: unimpl
func (r *Room) disconnectClient(client *Client) {
	panic("todo: unimpl")
}

// todo: unimpl
func (r *Room) isRoomEmpty() bool {
	panic("todo: unimpl")
}
