defmodule Vidsync.Meetings do
  alias Vidsync.Meetings.Room

  def create_room(hostname) do
    id = Uniq.UUID.uuid4()
    room = %Room{id: id, host_name: hostname}
    DynamicSupervisor.start_child(Vidsync.Meetings.RoomSupervisor, {Vidsync.Meetings.RoomServer, room})
    room
  end

  #helper function

  def get_room(room_id) do
    case Registry.lookup(Vidsync.RoomRegistry, room_id) do
      [] ->
        # Force an absolute crash here if initialization fails so we can inspect the stack trace
        {:ok, pid} = DynamicSupervisor.start_child(
          Vidsync.Meetings.RoomSupervisor,
          {Vidsync.Meetings.RoomServer, room_id}
        )
        {:ok, room_id}

      [_pid_info] ->
        {:ok, room_id}
    end
  end
  # helper function
  defp fetch_room_state(room_id) do
    GenServer.call({:via, Registry, {Vidsync.RoomRegistry, room_id}}, :get_state)
  end
  end
