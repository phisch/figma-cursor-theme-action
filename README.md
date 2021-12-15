# Figma Cursor Theme Generator
GitHub Action that generates a cursor theme and exports additional assets from a Figma file.

## Inputs

| Name | Type | Description |
| :- | :-: | :- |
| `figma_access_token` | string | **required** - Your personal [Figma access token](https://www.figma.com/developers/api#access-tokens). |
| `figma_file_key` | string | **required** - The `key` of the Figma file containing the cursor theme. Can be found in the url to of a figma file. `https://www.figma.com/file/:key/:title` |
| `sprite_component_set_id` | string | **required** - Figma node ID of the sprite component set. Refer to the [Component Set ID](#component-set-id) section to find this ID. |
| `alias_component_set_id` | string | **required** - Figma node ID of the alias component set. Refer to the [Component Set ID](#component-set-id) section to find this ID. |
| `theme_name` | string | **required** - Name of the cursor theme. Default `"Generated Cursor Theme"`. |
| `theme_comment` | string | **required** - Short comment or description of the cursor theme. Default `"This is a generated cursor theme."`. |
| `output_directory` | string | The directory to download assets and generate the cursor theme into. Default `"build"`. |

## Outputs
| Name | Type | Description |
| :- | :-: | :- |
| `version` | integer | The current version of the Figma file. |
| `theme_directory` | string | Directory containing the generated theme variants. |
| `svg_directory` | string | Directory containing all sprites rendered as svg files. |
| `export_directory` | string | Directory containing exports defined in the Figma file. |


## Example

```yml
steps:
  - name: Generate cursor theme from Figma file
    id: figma_cursor_theme
    uses: phisch/figma-cursor-theme-action@v0.6.0
    with:
      figma_access_token: ${{ secrets.FIGMA_ACCESS_TOKEN }}
      figma_file_key: ${{ secrets.FIGMA_FILE_KEY }}
      alias_component_set_id: '13:37'
      sprite_component_set_id: '73:31'
      output_directory: 'build'
      theme_name: 'Super Cool Cursors'
      theme_comment: 'Very awesome and cool cursor theme.'
```

## Figma file
This generator requires a Figma file with specific Figma components. The IDs of those components have to be defined as inputs for this GitHub action. More information under [Component Set ID](#component-set-id).

The components can be created manually, or you can use the very basic [template.fig](template.fig), which comes with those two components already created.

### Sprite Component
Variants of the sprite component are used to generate cursor files.

#### Properties
| Name | Type | Description |
| :- | :-: | :- |
| `cursor` | string | Name of the cursor this sprite belongs to. All sprites with the same cursor name end up in the same cursor file. |
| `base` | integer | Grid size this sprite is designed on. Different base grid sizes allow for more choice of cursor sizes. This is helpful on monitors with uncommon DPIs. The default base sizes 24 and 32 should cover most devices. |
| `xhot` | integer | Cursor hotspot on the x-axis. The hotspot defines where the actual tip of the cursor is. |
| `yhot` | integer | Cursor hotspot on the y-axis. |
| `frame` | integer | Animation frame index. This defines which index this sprite has in its animation. Cursors can have as many or as little frames as you want. A cursor without animation just has one frame with the index 0.|
| `delay` | integer | Frame visibility in milliseconds. Cursor animations are not necessarily linear. Each frame can be shown for a different amount of time. |
| `variant` | string | The cursor theme variant this sprite belongs to. Setting variant to anything other than `default` will generate a secondary cursor theme with this cursor. This variant will automatically inherit all cursors from the default variant. |

### Alias Component
The alias component is used to create cursor symlinks. This is helpful to link legacy cursor names to the ones provided through the sprites, or to use the same sprite for multiple cursors.

#### Properties
| Name | Type | Description |
| :- | :-: | :- |
| `alias` | string | Name of the alias. This will be the file name of the symlink. |
| `name` | string | Name of the cursor this is an alias for. This will be the symlink target. |

### Component Set ID
To aquire the component set ID, click the component and take it from the `node-id` parameter in the URL `https://www.figma.com/file/:key/template?node-id=:node-id`. This parameter is URL encoded, so make sure to replace `%3A` with `:`. A valid component set ID looks like: `13:37`