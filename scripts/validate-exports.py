"""Independent ZIP/XML/Excel validation. Run after Playwright export tests.
Test dependency only: pip install --target .local-tools/xlsx-validator openpyxl
"""
import sys
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree

sys.path.insert(0, str(Path('.local-tools/xlsx-validator').resolve()))
import openpyxl

for path in (Path('qa-results/export/contacts.xlsx'), Path('qa-results/export/contacts-browser.xlsx')):
    with ZipFile(path) as archive:
        assert archive.testzip() is None
        for name in archive.namelist():
            if name.endswith(('.xml', '.rels')):
                ElementTree.fromstring(archive.read(name))
    sheet = openpyxl.load_workbook(path)['Contatos']
    assert sheet.max_column == 7
    assert sheet['D1'].value == 'Área de atuação'
    assert sheet['G2'].value == '20/10/2026, 22:00:00'
    assert sheet['A2'].data_type == 's'
    if path.name == 'contacts.xlsx':
        assert sheet['A2'].value == '=1+1'
        assert sheet['D2'].value == 'Pesquisa'
    print(f'PASS OpenPyXL + ZIP CRC + XML: {path.name}')
