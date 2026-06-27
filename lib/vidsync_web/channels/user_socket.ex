defmodule VidsyncWeb.UserSocket do
  use Phoenix.Socket
  channel "room:*", VidsyncWeb.RoomChannel

  @impl true
  def connect(params, socket, _connect_info) do
    {:ok, socket}
  end

  @impl true
  def id(socket) do
    nil
  end

end
