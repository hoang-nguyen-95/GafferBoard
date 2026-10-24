from app.importers.names import display_name, fold_text, search_key


def test_fold_text():
    assert fold_text("Østergaard") == "ostergaard"
    assert fold_text("Guðjohnsen") == "gudjohnsen"
    assert fold_text("  Nguyễn   Văn ") == "nguyen van"
    assert fold_text("Müller-Weiß") == "muller-weiss"
    assert fold_text("") == ""


def test_display_name_prefers_common_name():
    assert display_name("Bruno Miguel", "Borges Fernandes", "Bruno Fernandes") == "Bruno Fernandes"
    assert display_name("Senne", "Lammens", "") == "Senne Lammens"
    assert display_name("", "Lammens", " ") == "Lammens"
    assert display_name("", "", "") == ""


def test_search_key_dedupes_parts():
    assert search_key("Marta Østergaard", "Marta", "Østergaard", "", "M.Ostergaard") == "marta ostergaard m.ostergaard"
