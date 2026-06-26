defmodule Vidsync.Meetings do
  alias Vidsync.Meetings.Room

  def create_room(hostname) do
    id = Uniq.UUID.uuid4()
    room = %Room{id: id, host_name: hostname}
    DynamicSupervisor.start_child(Vidsync.Meetings.RoomSupervisor, {Vidsync.Meetings.RoomServer, room})
    room
  end
end
