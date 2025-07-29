package session

// methods interact with room state directly

// deleteParticipant adds the given client to the room's participants map and client draw order.
//
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) addParticipant(client *Client) {
	client.Role = RoleTypeParticipant
	element := r.clientDrawOrderQueue.PushBack(client)
	client.drawOrderElement = element
	r.participants[client.ID] = client
}

// deleteParticipant deletes the given client from the room's participants map and client draw order.
//
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) deleteParticipant(client *Client) {
	delete(r.participants, client.ID)
	if client.drawOrderElement != nil {
		r.clientDrawOrderQueue.Remove(client.drawOrderElement)
		client.drawOrderElement = nil
	}
}

// addHost deletes the given client from the room's host map and client draw order.
//
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) addHost(client *Client) {
	client.Role = RoleTypeHost
	element := r.clientDrawOrderQueue.PushBack(client)
	client.drawOrderElement = element
	r.hosts[client.ID] = client
}

// deleteHost deletes the given client from the room's hosts map and client draw order queue.
//
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) deleteHost(client *Client) {
	delete(r.hosts, client.ID)
	if client.drawOrderElement != nil {
		r.clientDrawOrderQueue.Remove(client.drawOrderElement)
		client.drawOrderElement = nil
	}
}

// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) addWaiting(client *Client) {
	client.Role = RoleTypeWaiting
	element := r.waitingDrawOrderStack.PushFront(client)
	client.drawOrderElement = element
	r.hosts[client.ID] = client
}

// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) deleteWaiting(client *Client) {
	delete(r.waiting, client.ID)
	if client.drawOrderElement != nil {
		r.waitingDrawOrderStack.Remove(client.drawOrderElement)
		client.drawOrderElement = nil
	}
}

// addScreenshare adds a client as a screensharer to the room.
//
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) addScreenshare(client *Client) {
	client.Role = RoleTypeScreenshare
	element := r.clientDrawOrderQueue.PushBack(client)
	client.drawOrderElement = element
	r.sharingScreen[client.ID] = client
}

// deleteScreenshare deletes a client from the screensharers in the room.
//
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) deleteScreenshare(client *Client) {
	delete(r.sharingScreen, client.ID)
	if client.drawOrderElement != nil {
		r.clientDrawOrderQueue.Remove(client.drawOrderElement)
		client.drawOrderElement = nil
	}
}

// todo: unimpl
// addChatMessage adds a chat message to the room's chat history.
//
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) addChat(p AddChatPayload) {
	panic("todo: unimpl")
}

// todo: unimpl
// deleteChatMessage delete a chat message from the room's chat history by ID.
//
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) deleteChat(payload DeleteChatPayload) {
	panic("todo: unimpl")
}

// todo: unimpl
//
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) getRecentChats(startIndex int, maxCount int) {
	panic("todo: unimpl")
}

// todo: unimpl
//
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) disconnectClient(client *Client) {
	panic("todo: unimpl")
}

// isRoomEmpty() checks wether the given room has any clients *outside* of the waiting room.
//
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) isRoomEmpty() bool {
	return len(r.hosts) == 0 &&
		len(r.participants) == 0 &&
		len(r.sharingScreen) == 0
}
