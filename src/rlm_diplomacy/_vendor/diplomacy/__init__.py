# ==============================================================================
# Copyright (C) 2019 - Philip Paquette
#
#  This program is free software: you can redistribute it and/or modify it under
#  the terms of the GNU Affero General Public License as published by the Free
#  Software Foundation, either version 3 of the License, or (at your option) any
#  later version.
#
#  This program is distributed in the hope that it will be useful, but WITHOUT
#  ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
#  FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more
#  details.
#
#  You should have received a copy of the GNU Affero General Public License along
#  with this program.  If not, see <https://www.gnu.org/licenses/>.
# ==============================================================================
"""Module diplomacy, represent strategy game Diplomacy.

Vendored for rlm_diplomacy. Networking/server exports are intentionally removed.
"""

import sys

# Register top-level alias so upstream absolute imports (e.g. ``from diplomacy import settings``)
# resolve inside this vendored package.
sys.modules.setdefault("diplomacy", sys.modules[__name__])

from diplomacy.engine.game import Game
from diplomacy.engine.map import Map
from diplomacy.engine.message import Message
from diplomacy.engine.power import Power
from diplomacy.utils.game_phase_data import GamePhaseData

# Mirror loaded diplomacy.* modules under the vendored package namespace so both
# import styles resolve to the same module objects/classes.
for suffix in [
    "engine",
    "engine.game",
    "engine.map",
    "engine.message",
    "engine.power",
    "utils",
    "utils.game_phase_data",
]:
    full_name = f"diplomacy.{suffix}"
    if full_name in sys.modules:
        sys.modules[f"{__name__}.{suffix}"] = sys.modules[full_name]

__all__ = ["Game", "Map", "Message", "Power", "GamePhaseData"]
