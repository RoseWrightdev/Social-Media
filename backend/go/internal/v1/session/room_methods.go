package session

import "container/list"

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
	r.waiting[client.ID] = client
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

// addChatMessage adds a chat message to the room's chat history.
//
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) addChat(payload AddChatPayload) {
	// Add the chat message to the chat history list
	if r.chatHistory == nil {
		r.chatHistory = list.New()
	}

	// Add to the back of the list (newest messages at the end)
	r.chatHistory.PushBack(payload)

	// Enforce max chat history length
	if r.maxChatHistoryLength > 0 {
		for r.chatHistory.Len() > r.maxChatHistoryLength {
			r.chatHistory.Remove(r.chatHistory.Front())
		}
	}
}

// deleteChat deletes a chat message from the room's chat history by ID.
//
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) deleteChat(payload DeleteChatPayload) {
	if r.chatHistory == nil {
		return
	}

	// Iterate through the chat history to find and remove the message
	for e := r.chatHistory.Front(); e != nil; e = e.Next() {
		if chatMsg, ok := e.Value.(AddChatPayload); ok {
			if chatMsg.ChatId == payload.ChatId {
				r.chatHistory.Remove(e)
				return
			}
		}
	}
}

// getRecentChats retrieves recent chat messages from the room's history.
// The number of messages returned is limited by the payload specification.
//
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) getRecentChats(payload GetRecentChatsPayload) []AddChatPayload {
	if r.chatHistory == nil {
		return []AddChatPayload{}
	}

	// Convert list to slice for easier handling
	messages := make([]AddChatPayload, 0, r.chatHistory.Len())
	for e := r.chatHistory.Front(); e != nil; e = e.Next() {
		if chatMsg, ok := e.Value.(AddChatPayload); ok {
			messages = append(messages, chatMsg)
		}
	}

	// Return the most recent messages (from the end of the slice)
	// Default to last 50 messages if no specific limit is set
	limit := 50
	if len(messages) <= limit {
		return messages
	}
	return messages[len(messages)-limit:]
}

// todo: unimpl
//
// disconnectClient removes the client from all room states (hosts, participants, waiting, etc.)
//
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) disconnectClient(client *Client) {
	// Remove from role-based maps
	r.deleteHost(client)
	r.deleteParticipant(client)
	r.deleteWaiting(client)

	// Remove from state maps
	delete(r.raisingHand, client.ID)
	delete(r.sharingScreen, client.ID)
	delete(r.unmuted, client.ID)
	delete(r.cameraOn, client.ID)

	// Remove from hand raise queue if present
	if client.drawOrderElement != nil {
		r.handDrawOrderQueue.Remove(client.drawOrderElement)
		client.drawOrderElement = nil
	}
}

// isRoomEmpty() checks wether the given room has any clients *outside* of the waiting room.
//
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) isRoomEmpty() bool {
	return len(r.hosts) == 0 &&
		len(r.participants) == 0 &&
		len(r.sharingScreen) == 0
}

func (r *Room) raiseHand(payload RaiseHandPayload) {
	// Find the client who wants to raise their hand
	var client *Client
	for _, c := range r.participants {
		if c.ID == payload.ClientId {
			client = c
			break
		}
	}

	if client != nil {
		// Add to raising hand map
		r.raisingHand[client.ID] = client

		// Add to hand raise queue
		element := r.handDrawOrderQueue.PushBack(client)
		client.drawOrderElement = element
	}
}

func (r *Room) lowerHand(payload LowerHandPayload) {
	// Find the client who wants to lower their hand
	var client *Client
	for _, c := range r.participants {
		if c.ID == payload.ClientId {
			client = c
			break
		}
	}

	if client != nil {
		// Remove from raising hand map
		delete(r.raisingHand, client.ID)

		// Remove from hand raise queue
		if client.drawOrderElement != nil {
			r.handDrawOrderQueue.Remove(client.drawOrderElement)
			client.drawOrderElement = nil
		}
	}
}
