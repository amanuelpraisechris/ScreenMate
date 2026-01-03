"""Import parsers for various bibliographic formats."""
import re
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional
from io import StringIO
import logging

logger = logging.getLogger(__name__)


class ImportParser:
    """Base class for import parsers."""
    
    @staticmethod
    def parse(content: str) -> List[Dict[str, Any]]:
        """Parse content and return list of study dicts."""
        raise NotImplementedError


class RISParser(ImportParser):
    """Parser for RIS format (EndNote, Zotero, Mendeley export)."""
    
    TAG_MAP = {
        'TI': 'title',
        'T1': 'title',
        'AB': 'abstract',
        'N2': 'abstract',
        'AU': 'authors',
        'A1': 'authors',
        'PY': 'year',
        'Y1': 'year',
        'DA': 'year',
        'JO': 'journal',
        'JF': 'journal',
        'T2': 'journal',
        'DO': 'doi',
        'SN': 'issn',
        'KW': 'keywords',
        'UR': 'url',
        'L1': 'pdf_url',
        'ID': 'pmid',
        'AN': 'accession_number',
    }
    
    @staticmethod
    def parse(content: str) -> List[Dict[str, Any]]:
        """Parse RIS format content."""
        studies = []
        current_study = {}
        current_authors = []
        current_keywords = []
        
        lines = content.replace('\r\n', '\n').replace('\r', '\n').split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # RIS format: TAG  - Value
            match = re.match(r'^([A-Z][A-Z0-9])\s*-\s*(.*)$', line)
            if match:
                tag, value = match.groups()
                value = value.strip()
                
                if tag == 'TY':  # Start of new record
                    if current_study.get('title'):
                        if current_authors:
                            current_study['authors'] = current_authors
                        if current_keywords:
                            current_study['keywords'] = current_keywords
                        studies.append(current_study)
                    current_study = {'source': 'ris_import'}
                    current_authors = []
                    current_keywords = []
                elif tag == 'ER':  # End of record
                    if current_study.get('title'):
                        if current_authors:
                            current_study['authors'] = current_authors
                        if current_keywords:
                            current_study['keywords'] = current_keywords
                        studies.append(current_study)
                    current_study = {}
                    current_authors = []
                    current_keywords = []
                elif tag in ('AU', 'A1'):
                    current_authors.append(value)
                elif tag == 'KW':
                    current_keywords.append(value)
                elif tag in RISParser.TAG_MAP:
                    field = RISParser.TAG_MAP[tag]
                    if field == 'year':
                        # Extract year from various date formats
                        year_match = re.search(r'(\d{4})', value)
                        if year_match:
                            current_study[field] = int(year_match.group(1))
                    elif field not in current_study:  # Don't overwrite
                        current_study[field] = value
        
        # Handle last record if no ER tag
        if current_study.get('title'):
            if current_authors:
                current_study['authors'] = current_authors
            if current_keywords:
                current_study['keywords'] = current_keywords
            studies.append(current_study)
        
        return studies


class ENWParser(ImportParser):
    """Parser for EndNote XML format."""
    
    @staticmethod
    def parse(content: str) -> List[Dict[str, Any]]:
        """Parse EndNote XML format."""
        studies = []
        
        try:
            # Handle EndNote XML
            root = ET.fromstring(content)
            
            # Try different EndNote XML structures
            records = root.findall('.//record') or root.findall('.//RECORD') or root.findall('.//')
            
            for record in records:
                study = {'source': 'endnote_import'}
                
                # Title
                title_elem = record.find('.//title') or record.find('.//TITLE')
                if title_elem is not None and title_elem.text:
                    study['title'] = title_elem.text.strip()
                
                # Abstract
                abstract_elem = record.find('.//abstract') or record.find('.//ABSTRACT')
                if abstract_elem is not None and abstract_elem.text:
                    study['abstract'] = abstract_elem.text.strip()
                
                # Authors
                authors = []
                author_elems = record.findall('.//author') or record.findall('.//AUTHOR')
                for auth in author_elems:
                    if auth.text:
                        authors.append(auth.text.strip())
                if authors:
                    study['authors'] = authors
                
                # Year
                year_elem = record.find('.//year') or record.find('.//YEAR') or record.find('.//dates/year')
                if year_elem is not None and year_elem.text:
                    try:
                        study['year'] = int(year_elem.text.strip()[:4])
                    except ValueError:
                        pass
                
                # Journal
                journal_elem = record.find('.//secondary-title') or record.find('.//journal') or record.find('.//JOURNAL')
                if journal_elem is not None and journal_elem.text:
                    study['journal'] = journal_elem.text.strip()
                
                # DOI
                doi_elem = record.find('.//electronic-resource-num') or record.find('.//doi') or record.find('.//DOI')
                if doi_elem is not None and doi_elem.text:
                    study['doi'] = doi_elem.text.strip()
                
                if study.get('title'):
                    studies.append(study)
        
        except ET.ParseError as e:
            logger.error(f"Failed to parse EndNote XML: {e}")
            # Try as text/tab format
            return ENWParser._parse_text_format(content)
        
        return studies
    
    @staticmethod
    def _parse_text_format(content: str) -> List[Dict[str, Any]]:
        """Parse EndNote text export format."""
        studies = []
        current_study = {}
        current_field = None
        current_authors = []
        
        lines = content.split('\n')
        
        for line in lines:
            if line.startswith('%'):
                # Save previous study
                if current_study.get('title'):
                    if current_authors:
                        current_study['authors'] = current_authors
                    studies.append(current_study)
                    current_study = {'source': 'endnote_import'}
                    current_authors = []
                
                tag = line[1:2]
                value = line[3:].strip() if len(line) > 3 else ''
                
                if tag == 'T':
                    current_study['title'] = value
                elif tag == 'A':
                    current_authors.append(value)
                elif tag == 'X':
                    current_study['abstract'] = value
                elif tag == 'D':
                    try:
                        current_study['year'] = int(value[:4])
                    except ValueError:
                        pass
                elif tag == 'J':
                    current_study['journal'] = value
                elif tag == 'R':
                    current_study['doi'] = value
        
        if current_study.get('title'):
            if current_authors:
                current_study['authors'] = current_authors
            studies.append(current_study)
        
        return studies


class PubMedXMLParser(ImportParser):
    """Parser for PubMed XML format."""
    
    @staticmethod
    def parse(content: str) -> List[Dict[str, Any]]:
        """Parse PubMed XML format."""
        studies = []
        
        try:
            root = ET.fromstring(content)
            
            # Find all articles
            articles = root.findall('.//PubmedArticle') or root.findall('.//Article')
            
            for article in articles:
                study = {'source': 'pubmed_import'}
                
                # PMID
                pmid_elem = article.find('.//PMID')
                if pmid_elem is not None and pmid_elem.text:
                    study['pmid'] = pmid_elem.text.strip()
                
                # Title
                title_elem = article.find('.//ArticleTitle')
                if title_elem is not None:
                    study['title'] = ''.join(title_elem.itertext()).strip()
                
                # Abstract
                abstract_elem = article.find('.//Abstract/AbstractText')
                if abstract_elem is not None:
                    study['abstract'] = ''.join(abstract_elem.itertext()).strip()
                else:
                    # Handle structured abstracts
                    abstract_parts = article.findall('.//Abstract/AbstractText')
                    if abstract_parts:
                        abstract_texts = []
                        for part in abstract_parts:
                            label = part.get('Label', '')
                            text = ''.join(part.itertext()).strip()
                            if label:
                                abstract_texts.append(f"{label}: {text}")
                            else:
                                abstract_texts.append(text)
                        study['abstract'] = ' '.join(abstract_texts)
                
                # Authors
                authors = []
                author_list = article.find('.//AuthorList')
                if author_list is not None:
                    for author in author_list.findall('.//Author'):
                        lastname = author.find('LastName')
                        forename = author.find('ForeName') or author.find('Initials')
                        if lastname is not None and lastname.text:
                            name = lastname.text
                            if forename is not None and forename.text:
                                name = f"{lastname.text} {forename.text}"
                            authors.append(name)
                if authors:
                    study['authors'] = authors
                
                # Year
                pub_date = article.find('.//PubDate') or article.find('.//DateCompleted')
                if pub_date is not None:
                    year_elem = pub_date.find('Year')
                    if year_elem is not None and year_elem.text:
                        try:
                            study['year'] = int(year_elem.text)
                        except ValueError:
                            pass
                
                # Journal
                journal_elem = article.find('.//Journal/Title') or article.find('.//MedlineTA')
                if journal_elem is not None and journal_elem.text:
                    study['journal'] = journal_elem.text.strip()
                
                # DOI
                doi_elem = article.find('.//ArticleId[@IdType="doi"]')
                if doi_elem is not None and doi_elem.text:
                    study['doi'] = doi_elem.text.strip()
                else:
                    # Try ELocationID
                    eloc = article.find('.//ELocationID[@EIdType="doi"]')
                    if eloc is not None and eloc.text:
                        study['doi'] = eloc.text.strip()
                
                if study.get('title'):
                    studies.append(study)
        
        except ET.ParseError as e:
            logger.error(f"Failed to parse PubMed XML: {e}")
        
        return studies


class NBIBParser(ImportParser):
    """Parser for PubMed NBIB/MEDLINE format."""
    
    TAG_MAP = {
        'TI': 'title',
        'AB': 'abstract',
        'AU': 'authors',
        'FAU': 'authors',
        'DP': 'year',
        'TA': 'journal',
        'JT': 'journal_full',
        'AID': 'doi',
        'PMID': 'pmid',
        'PMC': 'pmc',
    }
    
    @staticmethod
    def parse(content: str) -> List[Dict[str, Any]]:
        """Parse NBIB/MEDLINE format."""
        studies = []
        current_study = {}
        current_authors = []
        current_tag = None
        current_value = []
        
        lines = content.replace('\r\n', '\n').split('\n')
        
        for line in lines:
            # Check if this is a new tag line
            if re.match(r'^[A-Z]{2,4}\s*-\s', line):
                # Save previous tag's value
                if current_tag and current_value:
                    value = ' '.join(current_value).strip()
                    
                    if current_tag in ('AU', 'FAU'):
                        current_authors.append(value)
                    elif current_tag == 'DP':
                        year_match = re.search(r'(\d{4})', value)
                        if year_match:
                            current_study['year'] = int(year_match.group(1))
                    elif current_tag == 'AID':
                        if '[doi]' in value:
                            current_study['doi'] = value.replace('[doi]', '').strip()
                    elif current_tag in NBIBParser.TAG_MAP:
                        field = NBIBParser.TAG_MAP[current_tag]
                        if field not in current_study:
                            current_study[field] = value
                
                # Parse new tag
                match = re.match(r'^([A-Z]{2,4})\s*-\s*(.*)$', line)
                if match:
                    current_tag = match.group(1)
                    current_value = [match.group(2).strip()] if match.group(2).strip() else []
            
            elif line.startswith('      '):  # Continuation line
                current_value.append(line.strip())
            
            elif not line.strip():  # Empty line = end of record
                if current_tag and current_value:
                    value = ' '.join(current_value).strip()
                    if current_tag in ('AU', 'FAU'):
                        current_authors.append(value)
                    elif current_tag in NBIBParser.TAG_MAP:
                        field = NBIBParser.TAG_MAP[current_tag]
                        if field not in current_study:
                            current_study[field] = value
                
                if current_study.get('title'):
                    if current_authors:
                        current_study['authors'] = current_authors
                    current_study['source'] = 'pubmed_import'
                    studies.append(current_study)
                
                current_study = {}
                current_authors = []
                current_tag = None
                current_value = []
        
        # Handle last record
        if current_study.get('title'):
            if current_authors:
                current_study['authors'] = current_authors
            current_study['source'] = 'pubmed_import'
            studies.append(current_study)
        
        return studies


class BibTeXParser(ImportParser):
    """Parser for BibTeX format."""
    
    @staticmethod
    def parse(content: str) -> List[Dict[str, Any]]:
        """Parse BibTeX format."""
        studies = []
        
        # Find all entries
        entries = re.findall(r'@\w+\s*\{[^@]+\}', content, re.DOTALL)
        
        for entry in entries:
            study = {'source': 'bibtex_import'}
            
            # Extract fields
            fields = re.findall(r'(\w+)\s*=\s*[\{"]([^}"]+)[\}"]', entry)
            
            for field, value in fields:
                field = field.lower()
                value = value.strip()
                
                if field == 'title':
                    # Remove LaTeX braces
                    study['title'] = re.sub(r'[{}]', '', value)
                elif field == 'abstract':
                    study['abstract'] = re.sub(r'[{}]', '', value)
                elif field == 'author':
                    # Split authors by 'and'
                    authors = [a.strip() for a in value.split(' and ')]
                    study['authors'] = authors
                elif field == 'year':
                    try:
                        study['year'] = int(value)
                    except ValueError:
                        pass
                elif field == 'journal' or field == 'journaltitle':
                    study['journal'] = value
                elif field == 'doi':
                    study['doi'] = value
                elif field == 'pmid':
                    study['pmid'] = value
            
            if study.get('title'):
                studies.append(study)
        
        return studies


class CSVParser(ImportParser):
    """Parser for CSV format."""
    
    @staticmethod
    def parse(content: str) -> List[Dict[str, Any]]:
        """Parse CSV format."""
        import csv
        
        studies = []
        
        try:
            # Detect delimiter
            sniffer = csv.Sniffer()
            dialect = sniffer.sniff(content[:2048])
            reader = csv.DictReader(StringIO(content), dialect=dialect)
            
            # Map common column names
            column_map = {
                'title': ['title', 'article title', 'study title', 'name'],
                'abstract': ['abstract', 'summary', 'description'],
                'authors': ['authors', 'author', 'creator', 'contributors'],
                'year': ['year', 'publication year', 'pub year', 'date'],
                'journal': ['journal', 'source', 'publication', 'journal title'],
                'doi': ['doi', 'digital object identifier'],
                'pmid': ['pmid', 'pubmed id', 'pubmed'],
            }
            
            for row in reader:
                study = {'source': 'csv_import'}
                
                # Normalize column names
                normalized_row = {k.lower().strip(): v for k, v in row.items() if v}
                
                for field, aliases in column_map.items():
                    for alias in aliases:
                        if alias in normalized_row:
                            value = normalized_row[alias].strip()
                            if field == 'authors' and value:
                                # Try to split authors
                                if ';' in value:
                                    study[field] = [a.strip() for a in value.split(';')]
                                elif ',' in value and value.count(',') > 1:
                                    study[field] = [a.strip() for a in value.split(',')]
                                else:
                                    study[field] = [value]
                            elif field == 'year' and value:
                                try:
                                    year_match = re.search(r'(\d{4})', value)
                                    if year_match:
                                        study[field] = int(year_match.group(1))
                                except ValueError:
                                    pass
                            elif value:
                                study[field] = value
                            break
                
                if study.get('title'):
                    studies.append(study)
        
        except Exception as e:
            logger.error(f"Failed to parse CSV: {e}")
        
        return studies


def detect_format(content: str, filename: str = '') -> str:
    """Detect the format of the import file."""
    filename = filename.lower()
    content_start = content[:500].strip()
    
    # Check by file extension
    if filename.endswith('.ris'):
        return 'ris'
    elif filename.endswith('.enw') or filename.endswith('.enl'):
        return 'endnote'
    elif filename.endswith('.nbib') or filename.endswith('.txt'):
        if 'PMID-' in content or 'TI  -' in content:
            return 'nbib'
    elif filename.endswith('.bib'):
        return 'bibtex'
    elif filename.endswith('.csv'):
        return 'csv'
    elif filename.endswith('.xml'):
        if '<PubmedArticle' in content or '<PubmedArticleSet' in content:
            return 'pubmed_xml'
        elif '<xml>' in content or '<records>' in content:
            return 'endnote_xml'
    
    # Check by content
    if content_start.startswith('TY  -') or re.match(r'^[A-Z]{2}\s+-', content_start):
        return 'ris'
    elif content_start.startswith('<?xml') or content_start.startswith('<'):
        if '<PubmedArticle' in content or '<PubmedArticleSet' in content:
            return 'pubmed_xml'
        return 'endnote_xml'
    elif content_start.startswith('@'):
        return 'bibtex'
    elif 'PMID-' in content_start or re.match(r'^[A-Z]{2,4}\s*-\s', content_start):
        return 'nbib'
    elif ',' in content_start or '\t' in content_start:
        return 'csv'
    
    return 'unknown'


def parse_import_file(content: str, filename: str = '') -> List[Dict[str, Any]]:
    """Parse an import file and return list of studies."""
    format_type = detect_format(content, filename)
    
    logger.info(f"Detected format: {format_type} for file: {filename}")
    
    parsers = {
        'ris': RISParser,
        'endnote': ENWParser,
        'endnote_xml': ENWParser,
        'pubmed_xml': PubMedXMLParser,
        'nbib': NBIBParser,
        'bibtex': BibTeXParser,
        'csv': CSVParser,
    }
    
    parser = parsers.get(format_type)
    if parser:
        return parser.parse(content)
    
    # Try each parser
    for parser_cls in [RISParser, NBIBParser, PubMedXMLParser, ENWParser, BibTeXParser, CSVParser]:
        try:
            result = parser_cls.parse(content)
            if result:
                return result
        except Exception as e:
            logger.debug(f"Parser {parser_cls.__name__} failed: {e}")
            continue
    
    return []
