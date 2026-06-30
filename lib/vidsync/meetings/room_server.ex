defmodule Vidsync.Meetings.RoomServer do
  use GenServer, restart: :temporary
  alias Vidsync.Meetings.Room

  def start_link(room_id) when is_binary(room_id) do
    GenServer.start_link(__MODULE__, room_id, name: via_tuple(room_id))
  end
  @impl true
  def init(room_id) do
    initial_state = %Room{
      id: room_id,
      host_name: "Pending..."
    }

    {:ok, initial_state}
  end

  def get_state(room_id) do
    GenServer.call(via_tuple(room_id), :get_state)
  end


  @impl true
  def handle_call(:get_state, _from, current_room_state) do
    {:reply, current_room_state, current_room_state}
  end

  defp via_tuple(room_id) do
    {:via, Registry, {Vidsync.RoomRegistry, room_id}}
  end

end
