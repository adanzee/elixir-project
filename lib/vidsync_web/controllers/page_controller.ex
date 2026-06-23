defmodule VidsyncWeb.PageController do
  use VidsyncWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end
end
