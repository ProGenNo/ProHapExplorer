<script lang="ts">
  import HeaderBar from "./components/HeaderBar.svelte";
  import BodyContainer from "./components/BodyContainer.svelte";
  import SidebarMenu from "./components/SidebarMenu.svelte";
</script>

<style>
  :global(.headerbar) {
    grid-area: header;
  }
  :global(.menuLeft) {
    /*background-color: brown;*/
    grid-area: sidebar;
    min-height: 400px;
    max-height: 80vh;
    overflow-y: scroll;
    overflow-x: hidden;
  }
  :global(.maincontent) {
    grid-area: maincontent;
    min-height: 400px;
    max-height: 80vh;
    overflow: scroll;
  }
  #gridWrapper {
    display: grid;
    grid-gap: 10px;
    grid-template-columns: 20% 45% 31%;
    grid-template-areas:
      "header  header  header"
      "sidebar maincontent maincontent"
      "footer  footer  footer";
    background-color: #fff;
    color: #444;
  }
</style>

<div id="gridWrapper">
  <HeaderBar class="headerbar" />
  <SidebarMenu class="menuLeft" />
  <BodyContainer class="maincontent" />
</div>
