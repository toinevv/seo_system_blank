"""
Utility functions for Jachtexamen Blog System
Common helper functions, validation, and utilities
"""

import os
import re
import json
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from pathlib import Path
from loguru import logger
import unicodedata
from urllib.parse import quote


def setup_logging(log_level: str = "INFO", log_file: str = "logs/blog_system.log") -> None:
    """Setup logging configuration"""
    
    # Create logs directory if it doesn't exist
    log_dir = Path(log_file).parent
    log_dir.mkdir(exist_ok=True)
    
    # Remove default logger
    logger.remove()
    
    # Add console logger
    logger.add(
        lambda msg: print(msg, end=""),
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level=log_level,
        colorize=True
    )
    
    # Add file logger
    logger.add(
        log_file,
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        level=log_level,
        rotation="10 MB",
        retention="30 days",
        compression="zip"
    )
    
    logger.info(f"Logging setup complete. Level: {log_level}, File: {log_file}")


def validate_environment() -> bool:
    """Validate that all required environment variables are set"""
    required_vars = [
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY", 
        "SUPABASE_URL",
        "SUPABASE_SERVICE_KEY"
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {missing_vars}")
        return False
    
    logger.info("Environment validation passed")
    return True


def sanitize_html(content: str) -> str:
    """Sanitize HTML content to prevent XSS"""
    # Remove script tags
    content = re.sub(r'<script[^>]*>.*?</script>', '', content, flags=re.IGNORECASE | re.DOTALL)
    
    # Remove dangerous attributes
    content = re.sub(r'on\w+\s*=\s*["\'][^"\']*["\']', '', content, flags=re.IGNORECASE)
    
    # Remove javascript: urls
    content = re.sub(r'href\s*=\s*["\']javascript:[^"\']*["\']', '', content, flags=re.IGNORECASE)
    
    return content


def generate_slug(text: str, max_length: int = 50) -> str:
    """Generate URL-friendly slug from text"""
    # Normalize unicode
    text = unicodedata.normalize('NFKD', text)
    
    # Convert to lowercase
    slug = text.lower()
    
    # Replace spaces and special characters with hyphens
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s_-]+', '-', slug)
    
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    
    # Truncate to max length
    if len(slug) > max_length:
        slug = slug[:max_length].rstrip('-')
    
    return slug


def extract_keywords(text: str, min_length: int = 3, max_keywords: int = 10) -> List[str]:
    """Extract keywords from text"""
    # Common Dutch stop words
    stop_words = {
        'de', 'het', 'een', 'van', 'in', 'voor', 'met', 'op', 'te', 'is', 'als', 'bij', 'dit', 'dat',
        'die', 'deze', 'naar', 'aan', 'om', 'door', 'over', 'tot', 'uit', 'ook', 'maar', 'zijn',
        'hebben', 'worden', 'kunnen', 'zijn', 'haar', 'hem', 'zijn', 'zij', 'wij', 'jullie'
    }
    
    # Extract words
    words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
    
    # Filter keywords
    keywords = []
    for word in words:
        if (len(word) >= min_length and 
            word not in stop_words and 
            word not in keywords):
            keywords.append(word)
    
    return keywords[:max_keywords]


def calculate_reading_time(text: str, words_per_minute: int = 250) -> int:
    """Calculate reading time in minutes"""
    # Remove HTML tags
    clean_text = re.sub(r'<[^>]+>', '', text)
    
    # Count words
    word_count = len(clean_text.split())
    
    # Calculate reading time
    reading_time = max(1, round(word_count / words_per_minute))
    
    return reading_time


def format_dutch_date(date: datetime, format_type: str = "full") -> str:
    """Format date in Dutch"""
    dutch_months = {
        1: "januari", 2: "februari", 3: "maart", 4: "april",
        5: "mei", 6: "juni", 7: "juli", 8: "augustus",
        9: "september", 10: "oktober", 11: "november", 12: "december"
    }
    
    dutch_days = {
        0: "maandag", 1: "dinsdag", 2: "woensdag", 3: "donderdag",
        4: "vrijdag", 5: "zaterdag", 6: "zondag"
    }
    
    if format_type == "full":
        return f"{dutch_days[date.weekday()]} {date.day} {dutch_months[date.month]} {date.year}"
    elif format_type == "short":
        return f"{date.day} {dutch_months[date.month]} {date.year}"
    else:
        return date.strftime("%d-%m-%Y")


def validate_article_data(article: Dict) -> List[str]:
    """Validate article data structure"""
    errors = []
    
    # Required fields
    required_fields = ["title", "content", "slug"]
    for field in required_fields:
        if not article.get(field):
            errors.append(f"Missing required field: {field}")
    
    # Title validation
    title = article.get("title", "")
    if len(title) < 10:
        errors.append("Title too short (minimum 10 characters)")
    elif len(title) > 100:
        errors.append("Title too long (maximum 100 characters)")
    
    # Content validation
    content = article.get("content", "")
    if len(content) < 500:
        errors.append("Content too short (minimum 500 characters)")
    
    # Slug validation
    slug = article.get("slug", "")
    if not re.match(r'^[a-z0-9-]+$', slug):
        errors.append("Invalid slug format (only lowercase letters, numbers, and hyphens)")
    
    return errors


def generate_excerpt(content: str, max_length: int = 160) -> str:
    """Generate excerpt from content"""
    # Remove HTML tags
    clean_text = re.sub(r'<[^>]+>', '', content)
    
    # Remove extra whitespace
    clean_text = ' '.join(clean_text.split())
    
    if len(clean_text) <= max_length:
        return clean_text
    
    # Find last complete sentence within limit
    excerpt = clean_text[:max_length]
    last_period = excerpt.rfind('.')
    last_exclamation = excerpt.rfind('!')
    last_question = excerpt.rfind('?')
    
    last_sentence_end = max(last_period, last_exclamation, last_question)
    
    if last_sentence_end > max_length * 0.7:  # If we found a sentence end after 70% of max length
        return excerpt[:last_sentence_end + 1]
    else:
        # Find last space and add ellipsis
        last_space = excerpt.rfind(' ')
        if last_space > 0:
            return excerpt[:last_space] + '...'
        else:
            return excerpt + '...'


def hash_content(content: str) -> str:
    """Generate hash of content for duplicate detection"""
    return hashlib.md5(content.encode('utf-8')).hexdigest()


def validate_dutch_text(text: str) -> bool:
    """Basic validation for Dutch text"""
    # Check for common Dutch words
    dutch_indicators = [
        'de', 'het', 'een', 'van', 'in', 'voor', 'met', 'op', 'te', 'is',
        'jacht', 'wild', 'natuur', 'Nederland', 'Nederlandse'
    ]
    
    text_lower = text.lower()
    found_indicators = sum(1 for word in dutch_indicators if word in text_lower)
    
    # Should have at least 3 Dutch indicators
    return found_indicators >= 3


def clean_filename(filename: str) -> str:
    """Clean filename for safe file operations"""
    # Remove or replace unsafe characters
    filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
    
    # Remove leading/trailing whitespace and dots
    filename = filename.strip(' .')
    
    # Truncate if too long
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        max_name_length = 255 - len(ext)
        filename = name[:max_name_length] + ext
    
    return filename


def format_number_dutch(number: Union[int, float]) -> str:
    """Format number in Dutch style (comma as decimal separator)"""
    if isinstance(number, float):
        return f"{number:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
    else:
        return f"{number:,}".replace(',', '.')


def create_backup_filename(prefix: str = "backup", extension: str = "json") -> str:
    """Create timestamped backup filename"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{prefix}_{timestamp}.{extension}"


def parse_time_string(time_str: str) -> Optional[datetime]:
    """Parse time string in various formats"""
    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
        "%d-%m-%Y %H:%M:%S",
        "%d-%m-%Y %H:%M",
        "%d-%m-%Y"
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(time_str, fmt)
        except ValueError:
            continue
    
    return None


def ensure_directory_exists(path: str) -> bool:
    """Ensure directory exists, create if not"""
    try:
        Path(path).mkdir(parents=True, exist_ok=True)
        return True
    except Exception as e:
        logger.error(f"Failed to create directory {path}: {e}")
        return False


def load_json_file(filepath: str, default: Any = None) -> Any:
    """Safely load JSON file with error handling"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.warning(f"JSON file not found: {filepath}")
        return default
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing JSON file {filepath}: {e}")
        return default
    except Exception as e:
        logger.error(f"Error loading JSON file {filepath}: {e}")
        return default


def save_json_file(data: Any, filepath: str) -> bool:
    """Safely save data to JSON file"""
    try:
        # Ensure directory exists
        ensure_directory_exists(os.path.dirname(filepath))
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error(f"Error saving JSON file {filepath}: {e}")
        return False


def truncate_text(text: str, max_length: int, suffix: str = "...") -> str:
    """Truncate text to maximum length"""
    if len(text) <= max_length:
        return text
    
    truncate_length = max_length - len(suffix)
    return text[:truncate_length].rstrip() + suffix


def normalize_whitespace(text: str) -> str:
    """Normalize whitespace in text"""
    # Replace multiple spaces/tabs/newlines with single space
    text = re.sub(r'\s+', ' ', text)
    
    # Strip leading/trailing whitespace
    return text.strip()


def get_file_size(filepath: str) -> int:
    """Get file size in bytes"""
    try:
        return os.path.getsize(filepath)
    except (OSError, FileNotFoundError):
        return 0


def format_file_size(size_bytes: int) -> str:
    """Format file size in human readable format"""
    if size_bytes == 0:
        return "0 B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024
        i += 1
    
    return f"{size_bytes:.1f} {size_names[i]}"


class Timer:
    """Context manager for timing operations"""
    
    def __init__(self, operation_name: str = "Operation"):
        self.operation_name = operation_name
        self.start_time = None
        self.end_time = None
    
    def __enter__(self):
        self.start_time = datetime.now()
        logger.debug(f"Starting {self.operation_name}")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.end_time = datetime.now()
        duration = (self.end_time - self.start_time).total_seconds()
        logger.debug(f"Completed {self.operation_name} in {duration:.2f} seconds")
    
    @property
    def duration(self) -> Optional[float]:
        if self.start_time and self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        return None


def retry_on_exception(max_attempts: int = 3, delay: float = 1.0):
    """Decorator for retrying functions on exception"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_attempts - 1:
                        logger.warning(f"Attempt {attempt + 1} failed for {func.__name__}: {e}")
                        time.sleep(delay)
                    else:
                        logger.error(f"All {max_attempts} attempts failed for {func.__name__}")
            
            raise last_exception
        
        return wrapper
    return decorator 