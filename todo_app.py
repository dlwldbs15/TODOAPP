#!/usr/bin/env python3
"""
Simple TODO App with Obsidian Markdown Integration
Stores TODOs in date-based markdown files in your Obsidian vault
"""

import json
import os
from datetime import datetime, timedelta
from pathlib import Path
import glob


class TodoApp:
    def __init__(self):
        self.config_file = "config.json"
        self.vault_path = self.load_config()
        self.current_date = datetime.now().strftime('%Y-%m-%d')
        self.todo_folder = None
        if self.vault_path:
            self.todo_folder = os.path.join(self.vault_path, "TODO")
            self.ensure_todo_folder()

    def load_config(self):
        """Load Obsidian vault path from config file"""
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    return config.get('vault_path')
            except Exception as e:
                print(f"설정 파일 로드 오류: {e}")
        return None

    def save_config(self, vault_path):
        """Save Obsidian vault path to config file"""
        config = {'vault_path': vault_path}
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            print(f"설정이 저장되었습니다: {vault_path}")
            return True
        except Exception as e:
            print(f"설정 저장 오류: {e}")
            return False

    def setup_vault_path(self):
        """Set up Obsidian vault path"""
        print("\n=== Obsidian Vault 경로 설정 ===")
        path = input("Obsidian vault 경로를 입력하세요: ").strip()

        if not os.path.exists(path):
            print(f"경로가 존재하지 않습니다: {path}")
            create = input("디렉토리를 생성하시겠습니까? (y/n): ").strip().lower()
            if create == 'y':
                try:
                    os.makedirs(path, exist_ok=True)
                    print(f"디렉토리가 생성되었습니다: {path}")
                except Exception as e:
                    print(f"디렉토리 생성 오류: {e}")
                    return False
            else:
                return False

        if self.save_config(path):
            self.vault_path = path
            self.todo_folder = os.path.join(self.vault_path, "TODO")
            self.ensure_todo_folder()
            return True
        return False

    def ensure_todo_folder(self):
        """Ensure TODO folder exists in vault"""
        if self.todo_folder and not os.path.exists(self.todo_folder):
            try:
                os.makedirs(self.todo_folder, exist_ok=True)
                print(f"TODO 폴더가 생성되었습니다: {self.todo_folder}")
            except Exception as e:
                print(f"TODO 폴더 생성 오류: {e}")

    def get_todo_file_for_date(self, date_str):
        """Get the TODO file path for a specific date"""
        if not self.todo_folder:
            return None
        return os.path.join(self.todo_folder, f"{date_str}.md")

    def get_all_todo_files(self):
        """Get all date-based TODO files"""
        if not self.todo_folder:
            return []

        pattern = os.path.join(self.todo_folder, "????-??-??.md")
        files = glob.glob(pattern)
        return sorted(files, reverse=True)

    def load_todos(self, date_str=None):
        """Load TODOs from markdown file for a specific date"""
        if date_str is None:
            date_str = self.current_date

        todo_file = self.get_todo_file_for_date(date_str)
        if not todo_file or not os.path.exists(todo_file):
            return []

        todos = []
        try:
            with open(todo_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith('- [ ]'):
                        todos.append({'text': line[6:], 'completed': False})
                    elif line.startswith('- [x]') or line.startswith('- [X]'):
                        todos.append({'text': line[6:], 'completed': True})
        except Exception as e:
            print(f"TODO 로드 오류: {e}")

        return todos

    def save_todos(self, todos, date_str=None):
        """Save TODOs to markdown file for a specific date"""
        if date_str is None:
            date_str = self.current_date

        todo_file = self.get_todo_file_for_date(date_str)
        if not todo_file:
            print("Vault 경로가 설정되지 않았습니다.")
            return False

        try:
            with open(todo_file, 'w', encoding='utf-8') as f:
                f.write(f"# TODO - {date_str}\n\n")
                f.write(f"_Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}_\n\n")

                # Incomplete todos
                incomplete = [t for t in todos if not t['completed']]
                if incomplete:
                    f.write("## 미완료\n\n")
                    for todo in incomplete:
                        f.write(f"- [ ] {todo['text']}\n")
                    f.write("\n")

                # Completed todos
                completed = [t for t in todos if t['completed']]
                if completed:
                    f.write("## 완료\n\n")
                    for todo in completed:
                        f.write(f"- [x] {todo['text']}\n")

            return True
        except Exception as e:
            print(f"TODO 저장 오류: {e}")
            return False

    def select_date(self):
        """Select a date for TODO operations"""
        print("\n=== 날짜 선택 ===")
        print("1. 오늘")
        print("2. 어제")
        print("3. 내일")
        print("4. 특정 날짜 입력")

        choice = input("\n선택: ").strip()

        if choice == '1':
            return self.current_date
        elif choice == '2':
            yesterday = datetime.now() - timedelta(days=1)
            return yesterday.strftime('%Y-%m-%d')
        elif choice == '3':
            tomorrow = datetime.now() + timedelta(days=1)
            return tomorrow.strftime('%Y-%m-%d')
        elif choice == '4':
            date_input = input("날짜 입력 (YYYY-MM-DD): ").strip()
            try:
                datetime.strptime(date_input, '%Y-%m-%d')
                return date_input
            except ValueError:
                print("잘못된 날짜 형식입니다.")
                return None
        else:
            print("잘못된 선택입니다.")
            return None

    def add_todo(self):
        """Add a new TODO"""
        if not self.vault_path:
            print("\n먼저 Obsidian vault 경로를 설정해주세요.")
            return

        date_str = self.select_date()
        if not date_str:
            return

        print(f"\n=== TODO 추가 ({date_str}) ===")
        text = input("TODO 내용: ").strip()

        if not text:
            print("내용을 입력해주세요.")
            return

        todos = self.load_todos(date_str)
        todos.append({'text': text, 'completed': False})

        if self.save_todos(todos, date_str):
            print(f"✓ TODO가 추가되었습니다: {text}")

    def view_todos(self):
        """View TODOs for a specific date"""
        if not self.vault_path:
            print("\n먼저 Obsidian vault 경로를 설정해주세요.")
            return

        date_str = self.select_date()
        if not date_str:
            return

        todos = self.load_todos(date_str)

        if not todos:
            print(f"\n{date_str}에 TODO가 없습니다.")
            return

        print(f"\n=== TODO 목록 ({date_str}) ===")

        incomplete = [t for t in todos if not t['completed']]
        completed = [t for t in todos if t['completed']]

        if incomplete:
            print("\n미완료:")
            for i, todo in enumerate(incomplete, 1):
                print(f"  {i}. [ ] {todo['text']}")

        if completed:
            print("\n완료:")
            for i, todo in enumerate(completed, 1):
                print(f"  {i}. [x] {todo['text']}")

        print(f"\n총 {len(todos)}개 (미완료: {len(incomplete)}, 완료: {len(completed)})")

    def view_all_todos(self):
        """View all TODOs from all dates"""
        if not self.vault_path:
            print("\n먼저 Obsidian vault 경로를 설정해주세요.")
            return

        todo_files = self.get_all_todo_files()

        if not todo_files:
            print("\nTODO 파일이 없습니다.")
            return

        print("\n=== 전체 TODO 목록 ===")

        for file_path in todo_files:
            date_str = os.path.basename(file_path).replace('.md', '')
            todos = self.load_todos(date_str)

            if todos:
                incomplete = [t for t in todos if not t['completed']]
                completed = [t for t in todos if t['completed']]

                print(f"\n📅 {date_str}")
                if incomplete:
                    for todo in incomplete:
                        print(f"  [ ] {todo['text']}")
                if completed:
                    for todo in completed:
                        print(f"  [x] {todo['text']}")

        print(f"\n총 {len(todo_files)}개의 날짜 파일")

    def complete_todo(self):
        """Mark a TODO as completed"""
        if not self.vault_path:
            print("\n먼저 Obsidian vault 경로를 설정해주세요.")
            return

        date_str = self.select_date()
        if not date_str:
            return

        todos = self.load_todos(date_str)
        incomplete = [t for t in todos if not t['completed']]

        if not incomplete:
            print(f"\n{date_str}에 완료할 TODO가 없습니다.")
            return

        print(f"\n=== TODO 완료 표시 ({date_str}) ===")
        print("\n미완료 TODO:")
        for i, todo in enumerate(incomplete, 1):
            print(f"  {i}. {todo['text']}")

        try:
            choice = input("\n완료할 TODO 번호 (취소: 0): ").strip()
            choice = int(choice)

            if choice == 0:
                return

            if 1 <= choice <= len(incomplete):
                incomplete[choice - 1]['completed'] = True

                if self.save_todos(todos, date_str):
                    print(f"✓ TODO가 완료되었습니다: {incomplete[choice - 1]['text']}")
            else:
                print("잘못된 번호입니다.")
        except ValueError:
            print("숫자를 입력해주세요.")

    def show_menu(self):
        """Display main menu"""
        print("\n" + "="*40)
        print("TODO 앱 - 날짜별 관리")
        print("="*40)
        print("1. TODO 추가")
        print("2. 특정 날짜 TODO 보기")
        print("3. 전체 TODO 보기")
        print("4. TODO 완료 표시")
        print("5. Vault 경로 설정")
        print("6. 종료")
        print("="*40)

        if self.vault_path:
            print(f"현재 Vault: {self.vault_path}")
            print(f"TODO 폴더: {self.todo_folder}")
            print(f"오늘 날짜: {self.current_date}")
        else:
            print("⚠️  Vault 경로가 설정되지 않았습니다")
        print("="*40)

    def run(self):
        """Run the TODO app"""
        print("TODO 앱에 오신 것을 환영합니다!")

        if not self.vault_path:
            print("\nObsidian vault 경로가 설정되지 않았습니다.")
            setup = input("지금 설정하시겠습니까? (y/n): ").strip().lower()
            if setup == 'y':
                self.setup_vault_path()

        while True:
            self.show_menu()
            choice = input("\n선택: ").strip()

            if choice == '1':
                self.add_todo()
            elif choice == '2':
                self.view_todos()
            elif choice == '3':
                self.view_all_todos()
            elif choice == '4':
                self.complete_todo()
            elif choice == '5':
                self.setup_vault_path()
            elif choice == '6':
                print("\nTODO 앱을 종료합니다. 안녕히 가세요!")
                break
            else:
                print("\n잘못된 선택입니다. 1-6 사이의 숫자를 입력해주세요.")


if __name__ == "__main__":
    app = TodoApp()
    app.run()
