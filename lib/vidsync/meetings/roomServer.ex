defmodule Vidsync.Meetings.RoomServer do
  use GenServer, restart: :temporary
  alias Vidsync.Meetings.Room


  defp via_tuple(room_id) do
    {:via, Registry, {Vidsync.RoomRegistry, room_id}}
  end

  def start_link(room = %Room{}) do
    GenServer.start_link(__MODULE__, room , [name: via_tuple(room.id)])
  end

  @impl true
  def init(room) do
    {:ok, room}
  end

  @impl true
  def handle_call(:get_state, _from, current_room_state) do
    {:reply, current_room_state, current_room_state}
  end
end
