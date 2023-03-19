import React, {createRef, FormEventHandler, useState} from 'react';

import './App.css';

import {Checkbox, Container, IconButton, List, ListItem, ListItemButton, ListItemText, TextField} from "@mui/material";
import * as uuid from 'uuid';
import {Delete} from "@mui/icons-material";

class Item {
    subItems: Array<Item> = []
    id: string = uuid.v4()
    constructor(
        public text: string,
        public done: boolean = false,
    ) {}
}

function App() {

    const [items, setItems] = useState<Array<Item>>([])

    const newItem = createRef<HTMLInputElement>()

    const handleNewItem: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        if (newItem.current?.value) {
            setItems(items.concat([new Item(newItem.current.value)]))
            newItem.current.value = ''
        }
    }

    const ItemsComponent: React.FC<{items: Item[]}> = ({items}) => {
        if (items.length === 0) {
            return (<></>)
        }
        return (<List>
            {items.map((item, index) =>
                <ListItem
                    key={item.id}
                    secondaryAction={
                        <IconButton edge="end" aria-label="delete">
                            <Delete />
                        </IconButton>
                    }
                >
                    <ListItemButton>
                        <Checkbox
                            checked={item.done}
                            disableRipple
                            tabIndex={-1}
                            edge="start"
                            inputProps={{ 'aria-labelledby': `${item.id}-text` }}
                        />

                        <ListItemText id={`${item.id}-text`}>
                            {item.text}
                        </ListItemText>
                    </ListItemButton>
                </ListItem>
            )}
        </List>)
    }

    return (
        <Container>
            <header>
                <h1>Liz'z Lemons</h1>
            </header>
            <main>
                <ItemsComponent items={items}/>
                <form onSubmit={handleNewItem}>
                    <TextField label="New Item"
                               variant="standard"
                               autoFocus
                               autoComplete="on"
                               autoCapitalize="words"
                               inputRef={newItem}
                    />
                </form>
            </main>
        </Container>
    );
}

export default App;
