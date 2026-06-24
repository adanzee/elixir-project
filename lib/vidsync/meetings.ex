defmodule Vidsync.Meetings do
  alias Vidsync.Meetings.Room

  def create_room(hostname) do
    id = Uniq.UUID.uuid4()
    %Room{id: id, host_name: hostname}

  end
end
