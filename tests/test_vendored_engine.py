from __future__ import annotations

from pathlib import Path

from rlm_diplomacy._vendor.diplomacy import Game


def test_engine_instantiation_and_start_phase() -> None:
    game = Game()
    assert game.get_current_phase() == "S1901M"


def test_starting_powers_and_units() -> None:
    game = Game()
    units = game.get_units()
    assert len(units) == 7
    assert set(units["FRANCE"]) == {"A PAR", "A MAR", "F BRE"}
    assert len(units["RUSSIA"]) == 4


def test_map_supply_centers_and_orders() -> None:
    game = Game()
    scs = set(game.map.scs)
    assert len(scs) == 34
    for center in ["PAR", "LON", "BER", "VIE", "CON"]:
        assert center in scs

    possible = game.get_all_possible_orders()
    assert "PAR" in possible
    assert "A PAR H" in possible["PAR"]
    assert "A PAR - BUR" in possible["PAR"]


def test_required_vendor_patches_present() -> None:
    base = Path("src/rlm_diplomacy/_vendor/diplomacy")

    init_text = (base / "__init__.py").read_text(encoding="utf-8")
    assert "coloredlogs" not in init_text
    assert "Connection" not in init_text
    assert "Server" not in init_text

    utils_init_text = (base / "utils/__init__.py").read_text(encoding="utf-8")
    assert "pytz" not in utils_init_text
    assert "str_to_seconds" not in utils_init_text

    common_text = (base / "utils/common.py").read_text(encoding="utf-8")
    assert "import bcrypt" not in common_text

    jsonable_text = (base / "utils/jsonable.py").read_text(encoding="utf-8")
    assert "ujson as json" not in jsonable_text
