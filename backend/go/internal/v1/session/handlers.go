package session

import "log/slog"


func (r *Room) handleAddChat(client *Client, event Event, payload any) {

}

func (r *Room) handleDeleteChat(client *Client, event Event, payload any) {

}

func (r *Room) handleGetRecentChats(client *Client, event Event, payload any) {

}

func (r *Room) handleRaiseHand(client *Client, event Event, payload any) {

}

func (r *Room) handleLowerHand(client *Client, event Event, payload any) {

}

func (r *Room) handleRequestWaiting(client *Client, event Event, payload any) {

}

func (r *Room) handleAcceptWaiting(client *Client, event Event, payload any) {

}

func (r *Room) handleDenyWaiting(client *Client, event Event, payload any) {

}

func (r *Room) handleRequestScreenshare(client *Client, event Event, payload any) {

}

func (r *Room) handleAcceptScreenshare(client *Client, event Event, payload any) {

}

func (r *Room) handleDenyScreenshare(client *Client, event Event, payload any) {

}

func logHelper(ok bool, ClientId ClientIdType, methodName string, RoomId RoomIdType) {
	if ok {
		slog.Info("Client called method in room",
			"ClientId", ClientId,
			"RoomId", RoomId,
			"methodName", methodName,
		)
	} else {
		slog.Error("Client called method in room and payload failed to marshall. Aborting request.",
			"ClientId", ClientId,
			"RoomId", RoomId,
			"methodName", methodName,
		)
	}
}